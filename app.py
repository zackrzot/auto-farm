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
parser = argparse.ArgumentParser(description='auto-farm - Automated Greenhouse Control System')
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
        print(f"Connected to {SERIAL_PORT} at {BAUD_RATE} baud")
        atexit.register(close_serial)
    except PermissionError as e:
        print(f"\nPERMISSION DENIED on {SERIAL_PORT}")
        print(f"   Possible causes:")
        print(f"   1. Another application is using this port (close Arduino IDE, etc.)")
        print(f"   2. Port is locked - try unplugging USB and plugging back in")
        print(f"   3. Need to run as Administrator")
        print(f"   Run this to check ports: python serial_diagnostic.py {SERIAL_PORT}\n")
    except serial.SerialException as e:
        print(f"Serial Error: {e}")
        print(f"   Run this to see available ports: python find_arduino.py")
    except Exception as e:
        print(f"Failed to connect to {SERIAL_PORT}: {type(e).__name__}: {e}")

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

@app.route('/camera')
def camera():
    return render_template('camera.html')

@app.route('/triggers')
def triggers():
    return render_template('triggers.html')

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

@app.route('/api/db_info')
def get_db_info():
    try:
        record_count = SensorData.query.count()
        db_path = 'instance/database.db'
        if os.path.exists(db_path):
            db_size = os.path.getsize(db_path)
        else:
            db_size = 0
        return jsonify({
            'record_count': record_count,
            'db_size': db_size
        })
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/api/triggers')
def get_triggers():
    latest = SensorData.query.order_by(SensorData.timestamp.desc()).first()
    triggers = []
    if latest:
        temp = latest.temp_f
        humidity = latest.humidity
        hyd_a = latest.hydrometer_a
        hyd_b = latest.hydrometer_b
        fan = latest.fan_signal
        
        # Define triggers
        triggers.append({
            'name': 'Air Temp Cooldown',
            'description': 'If temp > 90°F, fan speed scales to 100% from 90-95°F',
            'active': temp > 90,
            'details': f'Current temp: {temp}°F'
        })
        
        triggers.append({
            'name': 'High Humidity Control',
            'description': 'If humidity > 80%, fan runs at 50% minimum',
            'active': humidity > 80,
            'details': f'Current humidity: {humidity}%'
        })
        
        triggers.append({
            'name': 'Soil Moisture Low (A)',
            'description': 'If soil moisture A < 30%, activate water pump',
            'active': hyd_a < 30,
            'details': f'Current soil moisture A: {hyd_a}%'
        })
        
        triggers.append({
            'name': 'Soil Moisture Low (B)',
            'description': 'If soil moisture B < 30%, activate water pump',
            'active': hyd_b < 30,
            'details': f'Current soil moisture B: {hyd_b}%'
        })
        
        triggers.append({
            'name': 'Critical Temperature Alert',
            'description': 'If temp > 95°F, sound alarm and max fan',
            'active': temp > 95,
            'details': f'Current temp: {temp}°F'
        })
        
        triggers.append({
            'name': 'Fan Status Monitor',
            'description': 'Fan is running if signal > 0',
            'active': fan > 0,
            'details': f'Current fan signal: {fan}'
        })
        
        # Add more triggers here as needed
    return jsonify(triggers)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    if os.environ.get('WERKZEUG_RUN_MAIN') == 'true':
        init_serial()
        threading.Thread(target=read_serial, daemon=True).start()
    app.run(debug=True, host='0.0.0.0')