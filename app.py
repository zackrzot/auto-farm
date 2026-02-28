from flask import Flask, render_template, request, jsonify, send_file
import serial
import threading
import time
from datetime import datetime
from dateutil.relativedelta import relativedelta
from models import db, SensorData, TriggerLog
from config import get_accurate_time
import argparse
import os
import atexit
import cv2
from PIL import Image, ImageDraw, ImageFont

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# Serial setup
SERIAL_PORT = 'COM5'  # Default, can be overridden with --port argument
BAUD_RATE = 9600

# Camera setup
CAMERA_FOLDER = 'camera_images'
if not os.path.exists(CAMERA_FOLDER):
    os.makedirs(CAMERA_FOLDER)
CAMERA_INDEX = 0  # Default, can be overridden with --camera-index argument

# Parse command line arguments
parser = argparse.ArgumentParser(description='auto-farm - Automated Greenhouse Control System')
parser.add_argument('--port', '-p', type=str, help='Arduino COM port (e.g., COM3, /dev/ttyUSB0)')
parser.add_argument('--camera-index', '-c', type=int, help='Webcam camera index (default: 0, use find_webcam.py to list available cameras)')
args, unknown = parser.parse_known_args()

if args.port:
    SERIAL_PORT = args.port
    print(f"Using COM port: {SERIAL_PORT}")
if args.camera_index is not None:
    CAMERA_INDEX = args.camera_index
    print(f"Using camera index: {CAMERA_INDEX}")
ser = None

def init_serial():
    global ser
    try:
        ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
        print(f"Connected to {SERIAL_PORT} at {BAUD_RATE} baud")
        atexit.register(close_serial)
    except PermissionError:
        print(f"\nPERMISSION DENIED on {SERIAL_PORT}")
        print("   Possible causes:")
        print("   1. Another application is using this port (close Arduino IDE, etc.)")
        print("   2. Port is locked - try unplugging USB and plugging back in")
        print("   3. Need to run as Administrator")
        print(f"   Run this to check ports: python serial_diagnostic.py {SERIAL_PORT}\n")
    except serial.SerialException as e:
        print(f"Serial Error: {e}")
        print("   Run this to see available ports: python find_arduino.py")
    except Exception as e:
        print(f"Failed to connect to {SERIAL_PORT}: {type(e).__name__}: {e}")

def close_serial():
    if ser and ser.is_open:
        ser.close()
        print("Serial connection closed.")

def read_serial():
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
                        timestamp = get_accurate_time()
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


# TV Monitor page (for Smart TVs)
@app.route('/tv')
def tv():
    return render_template('tv.html')

# Manual trigger page
@app.route('/manual')
def manual():
    return render_template('manual.html')

@app.route('/chart')
def chart():
    return render_template('chart.html')

@app.route('/camera')
def camera():
    return render_template('camera.html')

@app.route('/triggers')
def triggers():
    return render_template('triggers.html')

@app.route('/api/time')
def get_time():
    """Return current accurate time from NTP server"""
    accurate_time = get_accurate_time()
    return jsonify({
        'timestamp': accurate_time.isoformat(),
        'unix_timestamp': accurate_time.timestamp()
    })

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
    # Accept valve, fan, and light commands
    if command in ['W1', 'W0', 'A', 'L1', 'L0']:
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


@app.route('/api/control/reset', methods=['POST'])
def control_reset():
    """Re-apply device states based on current trigger calculations (same logic as app startup)."""
    try:
        current_triggers = calculate_and_log_triggers()
        fan_speed = 0
        valve_open = False
        for t in current_triggers:
            if t['name'] == 'Air Temp Cooldown' and t['active']:
                fan_speed = 255
            elif t['name'] == 'High Humidity Control' and t['active']:
                fan_speed = max(fan_speed, 128)
            elif t['name'] == 'Water Valve Monitor' and t['active']:
                valve_open = True
        send_command(f"F:{fan_speed}")
        send_command("W1" if valve_open else "W0")
        return jsonify({
            'status': 'ok',
            'fan_speed': fan_speed,
            'valve_open': valve_open,
            'triggers': [{'name': t['name'], 'active': t['active']} for t in current_triggers]
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


def send_command(cmd):
    if ser and ser.is_open:
        ser.write((cmd + '\n').encode())

def capture_and_overlay_image(trigger_event=None, trigger_name=None):
    """Capture image from webcam and overlay sensor stats. Optionally overlay trigger event info."""
    try:
        # Get latest sensor data
        latest_data = SensorData.query.order_by(SensorData.timestamp.desc()).first()
        # Try to capture from webcam
        cap = cv2.VideoCapture(CAMERA_INDEX)
        if not cap.isOpened():
            return None
        ret, frame = cap.read()
        cap.release()
        if not ret:
            return None
        # Convert BGR to RGB for PIL
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        img = Image.fromarray(frame_rgb)
        # Draw overlay with sensor stats
        draw = ImageDraw.Draw(img)
        # Try to load a font, fallback to default if not available
        try:
            font_large = ImageFont.truetype("arial.ttf", 24)
            font_small = ImageFont.truetype("arial.ttf", 18)
        except:
            font_large = ImageFont.load_default()
            font_small = ImageFont.load_default()
        # Prepare text
        timestamp = get_accurate_time()
        timestamp_str = timestamp.strftime("%Y-%m-%d %H:%M:%S")
        overlay_text = [f"Timestamp: {timestamp_str}", ""]
        if latest_data:
            overlay_text.extend([
                f"Temperature: {latest_data.temp_f:.1f}°F",
                f"Humidity: {latest_data.humidity:.1f}%",
                f"Soil A: {latest_data.hydrometer_a:.1f}%",
                f"Soil B: {latest_data.hydrometer_b:.1f}%",
                f"Fan: {latest_data.fan_signal:.0f}"
            ])
        else:
            overlay_text.extend([
                "Temperature: --",
                "Humidity: --",
                "Soil A: --",
                "Soil B: --",
                "Fan: --"
            ])
        # Add trigger event info if provided
        if trigger_name or trigger_event:
            overlay_text.append("")
            if trigger_name:
                overlay_text.append(f"Trigger: {trigger_name}")
            if trigger_event:
                overlay_text.append(f"Event: {trigger_event}")
        # Draw semi-transparent background and text
        y_offset = 20
        for text in overlay_text:
            bbox = draw.textbbox((20, y_offset), text, font=font_large if "Timestamp" in text else font_small)
            draw.rectangle([(bbox[0]-5, bbox[1]-2), (bbox[2]+5, bbox[3]+2)], fill=(0, 0, 0, 180) if hasattr(draw, 'rectangle') else (0, 0, 0))
            draw.text((20, y_offset), text, fill=(255, 255, 255), font=font_large if "Timestamp" in text else font_small)
            y_offset += 35 if "Timestamp" in text else 28
        return img, timestamp
    except Exception as e:
        print(f"Error capturing image: {e}")
        return None

@app.route('/api/camera/capture', methods=['POST'])
def capture_camera():
    """Capture image from webcam with overlay and save to disk"""
    try:
        data = request.get_json(silent=True) or {}
        trigger_event = data.get('trigger_event')
        trigger_name = data.get('trigger_name')
        
        result = capture_and_overlay_image(trigger_event=trigger_event, trigger_name=trigger_name)
        if result is None:
            return jsonify({'error': 'Could not capture image from webcam'}), 400

        img, timestamp = result

        # Save image
        label_part = ""
        if trigger_name or trigger_event:
            name_str = trigger_name.replace(' ', '_') if trigger_name else ''
            event_str = trigger_event.replace(' ', '_') if trigger_event else ''
            label_part = f"_{name_str}_{event_str}".strip('_')
            if label_part:
                label_part = f"_{label_part}"
        filename = timestamp.strftime("%Y%m%d_%H%M%S") + f"{label_part}.jpg"
        filepath = os.path.join(CAMERA_FOLDER, filename)
        img.save(filepath)
        
        return jsonify({
            'status': 'ok',
            'filename': filename,
            'timestamp': timestamp.isoformat(),
            'path': filepath
        })
    except Exception as e:
        print(f"Error in capture_camera: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/camera/latest')
def get_latest_image():
    """Get info about the latest captured image"""
    try:
        files = sorted([f for f in os.listdir(CAMERA_FOLDER) if f.endswith('.jpg')], reverse=True)
        if not files:
            return jsonify({'error': 'No images found'}), 404
        
        latest_file = files[0]
        filepath = os.path.join(CAMERA_FOLDER, latest_file)
        file_stat = os.stat(filepath)
        
        return jsonify({
            'filename': latest_file,
            'timestamp': datetime.fromtimestamp(file_stat.st_mtime).isoformat(),
            'size': file_stat.st_size
        })
    except Exception as e:
        print(f"Error in get_latest_image: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/camera/images')
def get_camera_images():
    """Get list of captured images with pagination (limit, offset)"""
    try:
        limit = request.args.get('limit', default=10, type=int)
        offset = request.args.get('offset', default=0, type=int)
        images = []
        files = sorted([f for f in os.listdir(CAMERA_FOLDER) if f.endswith('.jpg')], reverse=True)
        paged_files = files[offset:offset+limit]
        for filename in paged_files:
            filepath = os.path.join(CAMERA_FOLDER, filename)
            file_stat = os.stat(filepath)
            images.append({
                'filename': filename,
                'timestamp': datetime.fromtimestamp(file_stat.st_mtime).isoformat(),
                'size': file_stat.st_size
            })
        return jsonify({'images': images, 'total': len(files)})
    except Exception as e:
        print(f"Error in get_camera_images: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/camera/images/<filename>')
def serve_image(filename):
    """Serve a camera image"""
    try:
        # Security: prevent directory traversal
        if '..' in filename or '/' in filename or '\\' in filename:
            return jsonify({'error': 'Invalid filename'}), 400
        
        filepath = os.path.join(CAMERA_FOLDER, filename)
        if not os.path.exists(filepath):
            return jsonify({'error': 'Image not found'}), 404
        
        return send_file(filepath, mimetype='image/jpeg')
    except Exception as e:
        print(f"Error serving image: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/history')
def get_history():
    start = request.args.get('start')
    end = request.args.get('end')
    if start and end:
        try:
            # Remove 'Z' suffix if present (from JavaScript ISO format)
            start = start.rstrip('Z') if start.endswith('Z') else start
            end = end.rstrip('Z') if end.endswith('Z') else end
            
            start_dt = datetime.fromisoformat(start)
            end_dt = datetime.fromisoformat(end)
            
            # Get sensor data
            sensor_data = SensorData.query.filter(
                SensorData.timestamp >= start_dt, 
                SensorData.timestamp <= end_dt
            ).order_by(SensorData.timestamp).all()
            
            # Get trigger logs for the same period
            trigger_logs = TriggerLog.query.filter(
                TriggerLog.timestamp >= start_dt,
                TriggerLog.timestamp <= end_dt
            ).order_by(TriggerLog.timestamp).all()
            
            # Aggregate sensor data by minute
            aggregated_data = {}
            for data in sensor_data:
                # Round timestamp to the nearest minute
                minute_key = data.timestamp.replace(second=0, microsecond=0)
                minute_iso = minute_key.isoformat()
                
                if minute_iso not in aggregated_data:
                    aggregated_data[minute_iso] = {
                        'timestamp': minute_key,
                        'temperatures': [],
                        'fan_signals': [],
                        'humidity_values': [],
                        'hydrometer_a_values': [],
                        'hydrometer_b_values': [],
                        'count': 0
                    }
                
                aggregated_data[minute_iso]['temperatures'].append(data.temp_f if data.temp_f is not None else 0)
                aggregated_data[minute_iso]['fan_signals'].append(data.fan_signal if data.fan_signal is not None else 0)
                aggregated_data[minute_iso]['humidity_values'].append(data.humidity if data.humidity is not None else 0)
                aggregated_data[minute_iso]['hydrometer_a_values'].append(data.hydrometer_a if data.hydrometer_a is not None else 0)
                aggregated_data[minute_iso]['hydrometer_b_values'].append(data.hydrometer_b if data.hydrometer_b is not None else 0)
                aggregated_data[minute_iso]['count'] += 1
            
            # Calculate averages for each minute
            result = []
            for minute_iso in sorted(aggregated_data.keys()):
                agg = aggregated_data[minute_iso]
                if agg['count'] > 0:
                    result.append({
                        'timestamp': agg['timestamp'].isoformat(),
                        'temp_f': sum(agg['temperatures']) / agg['count'],
                        'fan_signal': sum(agg['fan_signals']) / agg['count'],
                        'hydrometer_a': sum(agg['hydrometer_a_values']) / agg['count'],
                        'hydrometer_b': sum(agg['hydrometer_b_values']) / agg['count'],
                        'humidity': sum(agg['humidity_values']) / agg['count'],
                        'data_points': agg['count']
                    })
            
            # Build trigger log summary (by minute, taking the most recent state in each minute)
            trigger_summary = {}
            for log in trigger_logs:
                minute_key = log.timestamp.replace(second=0, microsecond=0)
                minute_iso = minute_key.isoformat()
                
                if minute_iso not in trigger_summary:
                    trigger_summary[minute_iso] = {}
                
                # Store the most recent (latest) state for each trigger in this minute
                trigger_summary[minute_iso][log.trigger_name] = log.active
            
            return jsonify({
                'sensor_data': result,
                'trigger_logs': trigger_summary,
                'aggregation': 'minute'
            })
        except Exception as e:
            print(f"Error in get_history: {e}")
            return jsonify({'error': str(e)}), 400
    return jsonify({'sensor_data': [], 'trigger_logs': {}})

@app.route('/api/available-dates')
def get_available_dates():
    year = request.args.get('year', type=int)
    month = request.args.get('month', type=int)
    
    if not year or not month:
        return jsonify({'error': 'year and month required'}), 400
    
    # Get first day of the month (start at midnight)
    month_start = datetime(year, month, 1)
    
    # Get first day of NEXT month (to capture all data through end of current month)
    # Add 24 hours extra to account for timezone differences
    month_end = month_start + relativedelta(months=1) + relativedelta(days=1)
    
    # Get all dates with data for this month and nearby dates
    data = SensorData.query.filter(
        SensorData.timestamp >= month_start,
        SensorData.timestamp < month_end
    ).all()
    
    # Extract unique dates
    dates_with_data = set()
    for record in data:
        dates_with_data.add(record.timestamp.date().day)
    
    return jsonify({'dates': sorted(list(dates_with_data))})

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

def calculate_and_log_triggers():
    """Calculate triggers from latest sensor data and log them to database"""
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
            'description': 'If temp > 80°F, fan speed scales to 100% from 80-85°F',
            'active': temp > 80,
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
            'description': 'If soil moisture A < 30%, activate water valve',
            'active': hyd_a < 30,
            'details': f'Current soil moisture A: {hyd_a}%'
        })
        triggers.append({
            'name': 'Soil Moisture Low (B)',
            'description': 'If soil moisture B < 30%, activate water valve',
            'active': hyd_b < 30,
            'details': f'Current soil moisture B: {hyd_b}%'
        })
        # Water valve monitor trigger (example: valve is open if either soil moisture low trigger is active)
        water_valve_active = (hyd_a < 30) or (hyd_b < 30)
        triggers.append({
            'name': 'Water Valve Monitor',
            'description': 'Water valve is open if soil moisture low triggers are active',
            'active': water_valve_active,
            'details': f"Water valve status: {'Open' if water_valve_active else 'Closed'}"
        })
        triggers.append({
            'name': 'Fan Status Monitor',
            'description': 'Fan is running only if signal > 0 (relay is OFF when signal is 0, cutting power)',
            'active': fan > 0,
            'details': f'Current fan signal: {fan} (0 = relay OFF, fan fully powered down)'
        })
        # Log each trigger state to database and capture images at start/stop
        timestamp = latest.timestamp
        for trigger in triggers:
            # Check previous state for this trigger
            prev_log = TriggerLog.query.filter_by(trigger_name=trigger['name']).order_by(TriggerLog.timestamp.desc()).first()
            prev_active = prev_log.active if prev_log else None
            # Detect start (False->True) and stop (True->False)
            if prev_active is not None and prev_active != trigger['active']:
                event_type = 'start' if trigger['active'] else 'stop'
                # Capture image with overlay
                result = capture_and_overlay_image(trigger_event=event_type.capitalize(), trigger_name=trigger['name'])
                if result is not None:
                    img, ts = result
                    filename = ts.strftime("%Y%m%d_%H%M%S") + f"_{trigger['name'].replace(' ','_')}_{event_type}.jpg"
                    filepath = os.path.join(CAMERA_FOLDER, filename)
                    img.save(filepath)
            log_entry = TriggerLog(
                timestamp=timestamp,
                trigger_name=trigger['name'],
                active=trigger['active']
            )
            db.session.add(log_entry)
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            print(f"Error logging triggers: {e}")
    return triggers

@app.route('/api/triggers')
def get_triggers():
    """Get current trigger states (calculated from latest sensor data)"""
    return jsonify(calculate_and_log_triggers())

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    if os.environ.get('WERKZEUG_RUN_MAIN') == 'true':
        init_serial()
        threading.Thread(target=read_serial, daemon=True).start()
        # Send correct device states based on active triggers
        with app.app_context():
            current_triggers = calculate_and_log_triggers()
            # Determine fan and valve commands from triggers
            fan_speed = 0
            valve_open = False
            for t in current_triggers:
                if t['name'] == 'Air Temp Cooldown' and t['active']:
                    # Fan scales to 100% from 80-85°F
                    fan_speed = 255
                elif t['name'] == 'High Humidity Control' and t['active']:
                    # Fan runs at 50% minimum
                    fan_speed = max(fan_speed, 128)
                elif t['name'] == 'Water Valve Monitor' and t['active']:
                    valve_open = True
            send_command(f"F:{fan_speed}")
            send_command("W1" if valve_open else "W0")
    app.run(debug=True, host='0.0.0.0')
