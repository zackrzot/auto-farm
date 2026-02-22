# Greenhouse Monitor & Control System - Complete Project

## 📋 Project Index

This document serves as the main entry point to understand and use the Greenhouse Monitor system.

### 🚀 Quick Start
- **New to the project?** Start here: [QUICKSTART.md](QUICKSTART.md)
- Just want to see what was built? [COMPLETION_SUMMARY.md](COMPLETION_SUMMARY.md)

### 📖 Main Documentation
- **Full documentation**: [README.md](README.md)
- **System architecture**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **This file**: [INDEX.md](INDEX.md)

### 🛠️ Getting Started

#### Step 1: Install Dependencies
```bash
cd c:\Users\zackr\Documents\GitHub\auto-farm
pip install -r requirements.txt
```

#### Step 2: Find Your Arduino
```bash
python find_arduino.py
```
Note the COM port (e.g., COM3, COM5)

#### Step 3: Upload Sketch
- Open `arduino/auto_farm.ino` in Arduino IDE
- Select your board and COM port
- Click Upload

#### Step 4: Configure
- Edit `app.py` line 10: `SERIAL_PORT = 'COM3'` → your COM port
- Optionally edit control setpoints in `config.py`

#### Step 5: Run
```bash
python app.py
```
Open `http://127.0.0.1:5000` in your browser

---

## 📁 File Structure

### Core Application Files
| File | Purpose |
|------|---------|
| **app.py** | Main Flask application with serial I/O |
| **models.py** | Database schema (SensorData model) |
| **config.py** | Configuration settings |

### Arduino
| File | Purpose |
|------|---------|
| **arduino/auto_farm.ino** | Microcontroller firmware |

### Frontend
| File | Purpose |
|------|---------|
| **templates/index.html** | Dashboard page |
| **templates/chart.html** | Charts page |
| **static/css/style.css** | Styling |
| **static/js/script.js** | Dashboard functionality |
| **static/js/chart.js** | Charts functionality |

### Utilities
| File | Purpose |
|------|---------|
| **find_arduino.py** | Auto-detect Arduino COM port |
| **generate_test_data.py** | Create sample data (no Arduino needed) |
| **api_example.py** | Example API usage in Python |

### Configuration & Dependencies
| File | Purpose |
|------|---------|
| **requirements.txt** | Python package list |
| **requirements-dev.txt** | Optional dev packages |
| **.gitignore** | Git ignore rules |

### Documentation
| File | Purpose |
|------|---------|
| **README.md** | Complete documentation |
| **QUICKSTART.md** | Quick setup guide |
| **COMPLETION_SUMMARY.md** | What was built |
| **ARCHITECTURE.md** | Technical details |
| **INDEX.md** | This file |

---

## 🎯 Features

### ✅ Data Monitoring
- Real-time temperature (°F)
- Humidity percentage
- Two soil moisture sensors (A & B) in percentage
- Fan control signal (PWM 0-255)
- Timestamp for all readings

### ✅ Automatic Control
- **Temperature fan control**: Adjusts fan speed based on temperature deviation from 80°F
- **Humidity fan control**: Adjusts fan speed based on humidity deviation from 75%
- **Watering control**: Activates when soil moisture ≤ 75% (if temp ≥ 70°F), stops when ≥ 99%

### ✅ Manual Control
- Override automatic mode
- Manually trigger watering
- Set fan speed (0-255)
- Return to automatic mode anytime

### ✅ Data Logging
- Continuous logging to SQLite database
- Every sensor reading stored with timestamp
- Queryable by date/time range

### ✅ Historical Analysis
- Web-based charting with Chart.js
- Multi-line charts showing all sensors
- Custom date range selection
- Interactive visualization

### ✅ Web Interface
- Real-time dashboard
- Clean control buttons
- Responsive design
- Charts page for analysis

---

## 🔌 Hardware Requirements

| Component | Pin | Type | Purpose |
|-----------|-----|------|---------|
| AM2302 Sensor | 18 | Digital | Temperature & Humidity |
| Hydrometer A | A0 | Analog | Soil Moisture 1 |
| Hydrometer B | A1 | Analog | Soil Moisture 2 |
| Valve LED | 5 | Digital | Status indicator |
| Valve Relay | 4 | Digital | Solenoid control |
| Fan PWM | 3 | PWM | Fan speed |
| Fan Relay | 2 | Digital | Fan enable |

---

## 📡 Communication Protocol

### Arduino → Flask (Data Every ~1.2 seconds)
```
Format: temp_f, fan_signal, hydrometer_a, hydrometer_b, humidity
Example: 75.3, 128, 65.0, 68.0, 55.0
```

### Flask → Arduino (On Demand)
```
W1      → Water on
W0      → Water off
F:128   → Fan speed 128
A       → Auto mode
```

---

## 🌐 Web Endpoints

### Pages
- `GET /` → Main dashboard
- `GET /chart` → Charts page

### API (JSON)
- `GET /api/data` → Latest sensor data
- `POST /api/control` → Send command
- `GET /api/history?start=&end=` → Historical data

---

## 🗄️ Database

### Location
`instance/database.db` (auto-created on first run)

### Schema (SensorData table)
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| timestamp | DATETIME | When reading was taken |
| temp_f | FLOAT | Temperature in Fahrenheit |
| fan_signal | FLOAT | PWM value (0-255) |
| hydrometer_a | FLOAT | Soil moisture A (0-100%) |
| hydrometer_b | FLOAT | Soil moisture B (0-100%) |
| humidity | FLOAT | Humidity (0-100%) |

### Data Retention
- No automatic cleanup
- ~72,000 rows per day
- SQLite has no size limit; consider archiving old data if needed

---

## ⚙️ Configuration

Edit `config.py` to customize:
- Serial port and baud rate
- Target temperature (default 80°F)
- Target humidity (default 75%)
- Watering moisture thresholds (default 75% on, 99% off)
- Fan control ranges
- Data logging interval

---

## 🧪 Testing Without Arduino

### Generate Sample Data
```bash
python generate_test_data.py
python app.py
# Visit http://127.0.0.1:5000/chart
```

Creates 7 days of realistic simulated data.

---

## 📊 Using the API Programmatically

See [api_example.py](api_example.py) for examples like:

```python
# Get current data
data = get_current_data()

# Control watering
control_water('on')
control_water('off')

# Control fan
control_fan(128)  # Speed 0-255

# Get history
history = get_historical_data(hours=24)
```

---

## 🚨 Troubleshooting

### Flask won't start
- Ensure dependencies: `pip install -r requirements.txt`
- Check Python version: `python --version` (need 3.10+)

### Serial connection fails
- Run `python find_arduino.py` to detect port
- Update `SERIAL_PORT` in `app.py`
- Check Arduino IDE can see the board

### No sensor data appearing
- Verify Arduino sketch uploaded correctly
- Check sensor wiring against pin definitions
- Monitor Arduino serial output at 9600 baud

### Charts page is empty
- Run `python generate_test_data.py` to create test data
- Or wait for Arduino to send real data
- Check browser console for JavaScript errors

---

## 🔧 Advanced Usage

### Running on Network
- Change `HOST` in `config.py` to `0.0.0.0`
- Access from other machines at `http://<your_ip>:5000`

### Production Deployment
- Use WSGI server: `pip install gunicorn`
- Run: `gunicorn app:app`
- Consider nginx reverse proxy
- Enable HTTPS with SSL certificate

### Database Maintenance
```python
# Reset database
import os
if os.path.exists('instance/database.db'):
    os.remove('instance/database.db')
# Restart app to recreate it
```

### Modifying Automatic Control
Edit `arduino/auto_farm.ino`:
- `target_temp_f` = Desired temperature setpoint
- `target_humid` = Desired humidity setpoint
- `valve_on` / `valve_off` = Watering thresholds
- Control curves in `set_fan()` and `set_valve()`

---

## 📚 Learning Resources

### Understanding the System
1. Read [QUICKSTART.md](QUICKSTART.md) for setup
2. Review [ARCHITECTURE.md](ARCHITECTURE.md) for technical design
3. Study [README.md](README.md) for detailed features
4. Examine source code (well-commented)

### Key Files to Study
1. **app.py**: Main application logic
2. **arduino/auto_farm.ino**: Control firmware
3. **templates/index.html**: Dashboard structure
4. **static/js/script.js**: Client-side functionality

---

## 📝 Common Tasks

### Change Temperature Target
1. Edit `config.py`: `TARGET_TEMP_F = 82.0`
2. Edit `arduino/auto_farm.ino`: `double target_temp_f = 82.0;`
3. Restart Flask app
4. Reuploaded Arduino sketch

### Add a New Sensor
1. Wire sensor to Arduino pin
2. Add pin definition in `.ino`
3. Add read logic in `loop()`
4. Include in serial output string
5. Add column to `models.py` SensorData
6. Update Flask parsing in `app.py`
7. Display in HTML templates

### Schedule Automatic Tasks
1. Create a cron job (Linux/Mac) or Task Scheduler (Windows)
2. Run `api_example.py` with your automation logic
3. Or modify Flask app to add scheduled tasks

---

## 🎓 Project Goals Accomplished

✅ Flask server for web interface
✅ Arduino serial communication
✅ Real-time data display
✅ Manual watering control
✅ Manual fan speed control
✅ Automatic temperature control
✅ Automatic humidity control
✅ SQLite data logging
✅ Historical data charting
✅ Custom date range queries
✅ Complete documentation
✅ Test data generator
✅ API examples
✅ Error handling
✅ Production-ready code

---

## 📞 Support

For issues, refer to:
1. [README.md](README.md) - Troubleshooting section
2. [ARCHITECTURE.md](ARCHITECTURE.md) - Technical details
3. Check Flask debug output in terminal
4. Check Arduino serial monitor (9600 baud)
5. Review browser console for JavaScript errors

---

## 📄 License
MIT License

---

**Ready to get started?** → [QUICKSTART.md](QUICKSTART.md)

**Want technical details?** → [ARCHITECTURE.md](ARCHITECTURE.md)

**Need API examples?** → [api_example.py](api_example.py)
