# Quick Start Guide

## 1. Find Your Arduino Port
```bash
python find_arduino.py
```
This will list all available COM ports and attempt to auto-detect your Arduino. Note the port (e.g., COM3, COM5).

## 2. Configure the Serial Port
You have two options:

**Option A: Command Line (Recommended)**
```bash
python app.py --port COM3
```

**Option B: Edit app.py**
Edit `app.py` and change:
```python
SERIAL_PORT = 'COM3'  # Replace with your port from step 1
```

## 3. Install Dependencies
```bash
pip install -r requirements.txt
```

## 4. Run the Application
```bash
python app.py
```

## 5. Open in Browser
Navigate to: **http://127.0.0.1:5000**

---

## Web Interface Features

### Dashboard (`/`)
- **Current Status**: Real-time temperature, humidity, soil moisture readings
- **Water Control**: 
  - Click "Water On" to manually water
  - Click "Water Off" to stop watering
  - Click "Auto" to return to automatic control
- **Fan Control**:
  - Enter a value 0-255 and click "Set Fan" for manual control
  - "Auto" mode allows automatic adjustment based on temperature/humidity

### Charts (`/chart`)
- Select start date/time
- Select end date/time
- Click "Load Data" to view historical trends
- Charts show temperature, humidity, moisture, and fan control signals

---

## Arduino Serial Commands

The Flask app sends commands to Arduino:
- `W1` - Turn watering on
- `W0` - Turn watering off
- `F:128` - Set fan to speed 128 (0-255)
- `A` - Return to auto mode

---

## Troubleshooting

**"No COM ports found"**
- Ensure Arduino is connected via USB
- Install USB drivers (CH340 if needed)
- Try a different USB cable

**"Flask: ModuleNotFoundError"**
- Run: `pip install -r requirements.txt`
- Check Python version: `python --version` (should be 3.10+)

**"No sensor data displaying"**
- Check Arduino has correct sketch uploaded
- Verify sensors are properly wired
- Monitor Arduino serial output at 9600 baud

---

## File Overview

| File | Purpose |
|------|---------|
| `app.py` | Main Flask application with serial communication |
| `models.py` | Database schema (SensorData table) |
| `config.py` | Configuration settings (ports, setpoints, etc.) |
| `find_arduino.py` | Helper script to detect Arduino port |
| `arduino/auto_farm.ino` | Arduino sketch for sensor reading and control |
| `templates/index.html` | Main dashboard |
| `templates/chart.html` | Historical data charts |
| `static/js/script.js` | Dashboard functionality |
| `static/js/chart.js` | Chart rendering |

---

## Next Steps

1. Upload `arduino/auto_farm.ino` to your Arduino using Arduino IDE
2. Connect sensors and relays as defined in the sketch
3. Set up serial port and start Flask application
4. Use web interface to monitor and control your greenhouse!
