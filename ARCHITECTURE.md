# System Architecture & Technical Details

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    WEB BROWSER (User)                       │
│              http://127.0.0.1:5000                          │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/JSON
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           FLASK WEB APPLICATION (app.py)                    │
├─────────────────────────────────────────────────────────────┤
│ Routes:                                                      │
│  • GET  /              → Dashboard (index.html)             │
│  • GET  /chart         → Charts page (chart.html)           │
│  • GET  /api/data      → Latest sensor JSON                │
│  • POST /api/control   → Send Arduino commands              │
│  • GET  /api/history   → Historical data (by date range)   │
├─────────────────────────────────────────────────────────────┤
│ Background Thread:                                           │
│  • Continuous serial port reading                           │
│  • Parse incoming sensor data                               │
│  • Write to database                                        │
└────────────────┬──────────────────────────────┬─────────────┘
      Serial     │                              │   SQLAlchemy
      9600 baud  │                              ▼
                 │                    ┌──────────────────────┐
                 │                    │  SQLite Database     │
                 │                    │  instance/database.db│
                 │                    │  (SensorData table)  │
                 │                    └──────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              ARDUINO MICROCONTROLLER                         │
│              (auto_farm.ino - 9600 baud)                    │
├─────────────────────────────────────────────────────────────┤
│ Sensors:                                                     │
│  • Pin 18: AM2302 Temperature/Humidity Sensor               │
│  • Pin A0: Hydrometer (Soil Moisture A)                     │
│  • Pin A1: Hydrometer (Soil Moisture B)                     │
│                                                              │
│ Actuators (Controlled by Flask):                            │
│  • Pin 5:  LED (Watering valve status indicator)            │
│  • Pin 4:  Relay (Watering solenoid valve control)          │
│  • Pin 3:  PWM (Exhaust fan speed 0-255)                    │
│  • Pin 2:  Relay (Fan enable/disable)                       │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### Incoming (Sensors → Flask → Browser)
```
Arduino sends data every ~1.2 seconds:
"75.3, 128, 65.5, 68.2, 52.0"
     │
     ├─ Temperature: 75.3°F
     ├─ Fan Signal: 128 (PWM value 0-255)
     ├─ Hydrometer A: 65.5%
     ├─ Hydrometer B: 68.2%
     └─ Humidity: 52.0%
     
     ▼ (parsed by Flask background thread)
     
Database insert: SensorData(
    timestamp=datetime.utcnow(),
    temp_f=75.3,
    fan_signal=128,
    hydrometer_a=65.5,
    hydrometer_b=68.2,
    humidity=52.0
)

     ▼ (fetched by browser every 1 second)
     
GET /api/data returns JSON:
{
    "timestamp": "2024-02-22T14:30:00",
    "temp_f": 75.3,
    "fan_signal": 128,
    "hydrometer_a": 65.5,
    "hydrometer_b": 68.2,
    "humidity": 52.0
}
```

### Outgoing (Browser → Flask → Arduino)
```
User clicks "Water On" button
│
▼ JavaScript sends:
POST /api/control
{"command": "W1"}

│
▼ Flask processes:
send_command("W1")
→ ser.write(b"W1\n")

│
▼ Arduino receives and processes:
if (command == "W1") {
    manual_water = true;
    digitalWrite(valve_led_pin, HIGH);
    digitalWrite(valve_relay_pin, HIGH);
}
```

## File Organization

```
auto-farm/
│
├── app.py
│   ├─ Flask application factory
│   ├─ Serial port management
│   ├─ Background read thread
│   ├─ API route handlers
│   └─ Command sending
│
├── models.py
│   └─ SQLAlchemy ORM models
│       └─ SensorData (timestamp, temp, humidity, moisture, fan)
│
├── config.py
│   ├─ SERIAL_PORT = 'COM3'
│   ├─ BAUD_RATE = 9600
│   ├─ Target setpoints (temp, humidity)
│   ├─ Watering thresholds
│   └─ Fan control curves
│
├── arduino/
│   └── auto_farm.ino
│       ├─ Pin definitions
│       ├─ Sensor initialization (AM2302)
│       ├─ Main control loop
│       ├─ Serial command parsing
│       ├─ set_fan() - PWM control
│       └─ set_valve() - Watering control
│
├── templates/
│   ├── index.html
│   │   ├─ Display current readings
│   │   ├─ Water control buttons
│   │   └─ Fan speed slider
│   │
│   └── chart.html
│       ├─ Date/time picker
│       ├─ Chart.js visualization
│       └─ Multi-axis charts
│
├── static/
│   ├── css/
│   │   └── style.css
│   │       └─ Dashboard styling
│   │
│   └── js/
│       ├── script.js
│       │   ├─ Fetch /api/data every 1s
│       │   ├─ Update DOM with values
│       │   └─ Button event handlers
│       │
│       └── chart.js
│           ├─ Fetch historical data
│           ├─ Chart.js initialization
│           └─ Multi-dataset rendering
│
├── requirements.txt
│   ├─ Flask==2.3.3
│   ├─ Flask-SQLAlchemy==3.0.5
│   └─ pyserial==3.5
│
├── database.db (auto-created)
│   └─ SensorData table with all readings
│
└── Documentation
    ├── README.md (comprehensive guide)
    ├── QUICKSTART.md (5-step setup)
    ├── COMPLETION_SUMMARY.md (what was built)
    └── api_example.py (usage examples)
```

## Control Logic

### Automatic Mode

#### Temperature-based Fan Control
```
Target Temp: 80°F
Temperature Range: 5°F

IF current_temp > 80°F:
    deviation = (current_temp - 80) / 5
    IF deviation > 1.0:
        fan_pwm = 255 (max)
    ELSE:
        fan_pwm = deviation * 255 (0-255 range)
ELSE:
    fan_pwm = 0
```

#### Humidity-based Fan Control
```
Target Humidity: 75%
Humidity Range: 15%

IF current_humidity > 75%:
    deviation = (current_humidity - 75) / 15
    fan_pwm_humidity = deviation * 255
ELSE:
    fan_pwm_humidity = 0

Use MAX(fan_pwm_temp, fan_pwm_humidity)
```

#### Watering Control
```
IF either moisture sensor < 1%:
    ERROR: Sensor malfunction
    DISABLE watering
ELSE IF moisture_a ≤ 75% OR moisture_b ≤ 75%:
    IF current_temp ≥ 70°F:
        ENABLE watering (set relay HIGH)
    ELSE:
        DISABLE watering (wait for warmer temp)
ELSE IF moisture_a ≥ 99% AND moisture_b ≥ 99%:
    DISABLE watering (soil saturated)
```

### Manual Mode

#### Water Control
- `W1`: Set manual_water = true, activate valve immediately
- `W0`: Set manual_water = false, deactivate valve immediately
- `set_valve()` returns early if manual_water is active

#### Fan Control
- `F:<speed>`: Set manual_fan = true, set PWM to speed (0-255)
- `set_fan()` returns early if manual_fan is active

#### Return to Auto
- `A`: Set manual_water = false, manual_fan = false
- Both control functions resume automatic operation

## Serial Protocol

### Arduino → Flask (Data)
Format: `<temp_f>, <fan_signal>, <hydrometer_a>, <hydrometer_b>, <humidity>`

Example: `72.5, 128, 65.0, 68.0, 55.0`

Frequency: Every ~1.2 seconds (configurable via LOG_INTERVAL_MS and LOG_READS_PER_SEND)

### Flask → Arduino (Commands)
- `W1\n` - Water on
- `W0\n` - Water off
- `F:<speed>\n` - Set fan (e.g., `F:128\n`)
- `A\n` - Auto mode

All commands are newline-terminated.

## Database Schema

### SensorData Table
```sql
CREATE TABLE sensor_data (
    id INTEGER PRIMARY KEY,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    temp_f FLOAT,
    fan_signal FLOAT,
    hydrometer_a FLOAT,
    hydrometer_b FLOAT,
    humidity FLOAT
);

CREATE INDEX idx_timestamp ON sensor_data(timestamp);
```

## API Endpoints

### GET /api/data
Returns JSON of latest reading
```json
{
    "timestamp": "2024-02-22T14:30:45.123",
    "temp_f": 75.3,
    "fan_signal": 128,
    "hydrometer_a": 65.5,
    "hydrometer_b": 68.2,
    "humidity": 52.0
}
```

### POST /api/control
Send control command
```json
Request: {"command": "W1"}
Response: {"status": "ok"} or {"status": "error"}
```

### GET /api/history?start=ISO_STRING&end=ISO_STRING
Get historical data range
```json
Response: [
    {
        "timestamp": "2024-02-22T14:29:45",
        "temp_f": 75.1,
        "fan_signal": 120,
        "hydrometer_a": 65.0,
        "hydrometer_b": 68.0,
        "humidity": 51.5
    },
    ...
]
```

## Threading Model

### Main Thread
- Flask web server
- Handles HTTP requests
- Serves static files and templates
- Processes control commands

### Background Serial Thread
```python
def read_serial():
    while True:
        if ser.is_open:
            line = ser.readline().decode().strip()
            # Parse: "temp, fan, moisture_a, moisture_b, humidity"
            # Create SensorData object
            # db.session.add(data)
            # db.session.commit()
        time.sleep(0.1)  # Don't peg the CPU
```

- Daemon thread (kills when main thread dies)
- Continuously reads serial port
- Parses incoming data
- Commits to database
- Never blocks Flask request handling

## Error Handling

### Serial Connection Errors
- Graceful fallback if Arduino not connected
- Server still runs, just no data
- Automatic retry on reconnection

### Data Parsing Errors
- Malformed sensor data is skipped
- Error printed to console
- No database write for bad data

### Control Command Errors
- Invalid command values (e.g., fan > 255)
- Returns `{"status": "error"}`
- Arduino not affected

## Performance Considerations

- **Database**: One row per ~1.2 seconds → ~72K rows per day
- **Memory**: Minimal (serial buffer, small thread)
- **Network**: Negligible (JSON payloads ~100 bytes)
- **Web Server**: Development server fine for local use; use production WSGI (gunicorn) for deployment

## Extensibility

### Adding a New Sensor
1. Add pin definition to Arduino sketch
2. Read sensor in loop()
3. Include in serial output
4. Add column to SensorData model
5. Update Flask parsing logic
6. Add to HTML displays
7. Add to chart datasets

### Adding a New Actuator
1. Add pin definition to Arduino sketch
2. Create control logic function
3. Add serial command handler
4. Add Flask route/control logic
5. Add button/control to HTML

### Changing Control Setpoints
- Edit `config.py` values
- Modify Arduino sketch constants
- No code recompilation needed
