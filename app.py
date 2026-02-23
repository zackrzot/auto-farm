from flask import Flask, render_template, request, jsonify
import serial
from serial import SerialException
import threading
import time
from datetime import datetime
from models import db, SensorData
import json
import argparse
import os
import atexit

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# Serial setup
SERIAL_PORT = 'COM5'  # Default, can be overridden with --port argument
BAUD_RATE = 9600

# Parse command line arguments
parser = argparse.ArgumentParser(description='Greenhouse Monitor & Control System')
parser.add_argument('--port', '-p', type=str, help='Arduino COM port (e.g., COM3, /dev/ttyUSB0)')
args, unknown = parser.parse_known_args()

if args.port:
    SERIAL_PORT = args.port
    print(f"Using COM port: {SERIAL_PORT}")
ser = None

def init_serial():
    global ser
    try:
        ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
        print(f"✓ Connected to {SERIAL_PORT} at {BAUD_RATE} baud")
        atexit.register(close_serial)
    except PermissionError as e:
        print(f"\n❌ PERMISSION DENIED on {SERIAL_PORT}")
        print(f"   Possible causes:")
        print(f"   1. Another application is using this port (close Arduino IDE, etc.)")
        print(f"   2. Port is locked - try unplugging USB and plugging back in")
        print(f"   3. Need to run as Administrator")
        print(f"   Run this to check ports: python serial_diagnostic.py {SERIAL_PORT}\n")
    except serial.SerialException as e:
        print(f"❌ Serial Error: {e}")
        print(f"   Run this to see available ports: python find_arduino.py")
    except Exception as e:
        print(f"❌ Failed to connect to {SERIAL_PORT}: {type(e).__name__}: {e}")

def close_serial():
    global ser
    if ser and ser.is_open:
        ser.close()
        print("Serial connection closed.")

def read_serial():
    global ser
    while True:
        if ser and ser.is_open:
            try:
                line = ser.readline().decode('utf-8').strip()
                if line:
                    parts = line.split(', ')
                    if len(parts) == 5:
                        temp_f = float(parts[0])
                        fan_signal = float(parts[1])
                        hydrometer_a = float(parts[2])
                        hydrometer_b = float(parts[3])
                        humidity = float(parts[4])
                        timestamp = datetime.now()
                        data = SensorData(timestamp=timestamp, temp_f=temp_f, fan_signal=fan_signal,
                                        hydrometer_a=hydrometer_a, hydrometer_b=hydrometer_b, humidity=humidity)
                        with app.app_context():
                            db.session.add(data)
                            db.session.commit()
            except Exception as e:
                print(f"Error reading serial: {e}")
        time.sleep(0.1)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/chart')
def chart():
    return render_template('chart.html')

@app.route('/api/data')
def get_data():
    latest = SensorData.query.order_by(SensorData.timestamp.desc()).first()
    if latest:
        return jsonify({
            'timestamp': latest.timestamp.isoformat(),
            'temp_f': latest.temp_f,
            'fan_signal': latest.fan_signal,
            'hydrometer_a': latest.hydrometer_a,
            'hydrometer_b': latest.hydrometer_b,
            'humidity': latest.humidity
        })
    return jsonify({})

@app.route('/api/control', methods=['POST'])
def control():
    data = request.json
    command = data.get('command')
    if command in ['W1', 'W0', 'A']:
        send_command(command)
        return jsonify({'status': 'ok'})
    elif command.startswith('F:'):
        try:
            speed = int(command.split(':')[1])
            if 0 <= speed <= 255:
                send_command(f"F:{speed}")
                return jsonify({'status': 'ok'})
        except:
            pass
    return jsonify({'status': 'error'})

def send_command(cmd):
    if ser and ser.is_open:
        ser.write((cmd + '\n').encode())

@app.route('/api/history')
def get_history():
    start = request.args.get('start')
    end = request.args.get('end')
    if start and end:
        start_dt = datetime.fromisoformat(start)
        end_dt = datetime.fromisoformat(end)
        data = SensorData.query.filter(SensorData.timestamp >= start_dt, SensorData.timestamp <= end_dt).all()
        result = [{
            'timestamp': d.timestamp.isoformat(),
            'temp_f': d.temp_f,
            'fan_signal': d.fan_signal,
            'hydrometer_a': d.hydrometer_a,
            'hydrometer_b': d.hydrometer_b,
            'humidity': d.humidity
        } for d in data]
        return jsonify(result)
    return jsonify([])

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    if os.environ.get('WERKZEUG_RUN_MAIN') == 'true':
        init_serial()
        threading.Thread(target=read_serial, daemon=True).start()
    app.run(debug=True, host='0.0.0.0')