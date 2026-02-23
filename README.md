# Auto Farm - Greenhouse Monitor & Control System

A Python Flask web application that monitors and controls a greenhouse environment by communicating with an Arduino microcontroller. The system tracks temperature, humidity, soil moisture, and allows manual control of watering and exhaust fan systems.

## Features

- **Real-time Monitoring**: Display current temperature, humidity, and soil moisture levels
- **Automatic Control**: Fan speed and watering valve automatically controlled based on sensor readings
- **Manual Control**: Override automatic mode to manually control watering and fan speed
- **Data Logging**: All sensor data continuously recorded to SQLite database
- **Historical Charts**: View sensor data over custom time periods with interactive charts
- **Serial Communication**: Two-way communication with Arduino over serial port

## System Architecture

### Hardware Components
- **Arduino**: Main controller running `auto_farm.ino`
- **Temperature & Humidity Sensor**: AM2302 sensor on pin 18
- **Soil Moisture Sensors**: Two hydrometer sensors on analog pins A0 and A1
- **Watering System**: Relay-controlled solenoid valve (LED on pin 5, relay on pin 4)
- **Exhaust Fan**: PWM-controlled fan (PWM on pin 3, relay on pin 2)

### Software Components
- **Backend**: Flask web framework with SQLAlchemy ORM
- **Database**: SQLite for time-series sensor data
- **Frontend**: HTML/CSS/JavaScript with Chart.js for visualization
- **Serial Communication**: PySerial for Arduino communication

## Installation

### Prerequisites
- Python 3.10+
- Arduino with the provided `auto_farm.ino` sketch uploaded
- Arduino connected via USB (COM port will vary by system)

### Setup Steps

1. **Clone the repository**:
   ```bash
   cd c:\Users\zackr\Documents\GitHub\auto-farm
   ```

2. **Create a virtual environment (optional but recommended)**:
   ```bash
   python -m venv venv
   venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Arduino port** (if not COM3):
   - **Option A - Command Line (Recommended):**
     ```bash
     python app.py --port COM3
     ```
   - **Option B - Edit app.py:**
     Change `SERIAL_PORT = 'COM3'` to your Arduino's port
   - Find your port in Windows Device Manager (Ports section) or use:
     ```bash
     python -m serial.tools.list_ports
     ```

5. **Run the application**:
   ```bash
   python app.py
   ```

6. **Access the web interface**:
   - Open `http://127.0.0.1:5000` in your web browser
   - Charts available at `http://127.0.0.1:5000/chart`

## Usage

### Main Dashboard (`/`)
- **Real-time Display**: Shows current temperature, humidity, and soil moisture readings
- **Fan Control**: 
  - Set fan speed (0-255) for manual control
  - Auto mode adjusts based on temperature and humidity
- **Watering Control**:
  - **Water On**: Manually activate watering (if temperature >= 70°F)
  - **Water Off**: Manually deactivate watering
  - **Auto Mode**: Return to automatic control based on soil moisture

### Charts Page (`/chart`)
- Select start and end dates to view historical data
- Multiple overlaid datasets:
  - Temperature (°F)
  - Humidity (%)
  - Soil Moisture A & B (%)
  - Fan Signal (0-255)

## Arduino Sketch Commands

The Arduino listens for serial commands from the Flask app:

- `W1`: Enable watering valve
- `W0`: Disable watering valve
- `F:<speed>`: Set fan speed (0-255)
- `A`: Return to automatic mode

Data is sent from Arduino to Flask every ~1.2 seconds (200ms delay × 6 iterations):
```
<temp_f>, <fan_signal>, <hydrometer_a>, <hydrometer_b>, <humidity>
```

Example: `72.5, 128, 65.0, 68.0, 55.0`

## Database Schema

The SQLite database contains the `sensor_data` table with:
- `id`: Primary key
- `timestamp`: When data was recorded (UTC)
- `temp_f`: Temperature in Fahrenheit
- `fan_signal`: Current fan PWM value (0-255)
- `hydrometer_a`: Soil moisture A percentage (0-100)
- `hydrometer_b`: Soil moisture B percentage (0-100)
- `humidity`: Relative humidity percentage (0-100)

Database file: `instance/database.db` (created automatically on first run)

## Files Structure

```
auto-farm/
├── app.py                 # Main Flask application
├── models.py              # SQLAlchemy database models
├── requirements.txt       # Python package dependencies
├── arduino/
│   └── auto_farm.ino     # Arduino sketch
├── templates/
│   ├── index.html        # Main dashboard
│   └── chart.html        # Charts page
└── static/
    ├── css/
    │   └── style.css     # Styling
    └── js/
        ├── script.js     # Dashboard functionality
        └── chart.js      # Chart functionality
```

## Automatic Control Logic

### Watering System
- **Activation**: Triggers when soil moisture ≤ 75% AND temperature ≥ 70°F
- **Deactivation**: Triggers when both soil moisture sensors ≥ 99%
- **Safety**: Disables if soil moisture sensors report error (< 1%)

### Exhaust Fan
- **Temperature Control**: 0-100% speed if temperature exceeds target (80°F) by up to 5°F
- **Humidity Control**: 0-100% speed if humidity exceeds target (75%) by up to 15%
- **Combined**: Uses whichever control signal is higher
- **Relay**: Disables for PWM values ≤ 1

## Troubleshooting

### Serial Connection Failed
- Check Arduino is connected via USB
- Verify correct COM port: `python find_arduino.py`
- Run diagnostics: `python serial_diagnostic.py`
- For "Access Denied" errors: See [SERIAL_TROUBLESHOOTING.md](SERIAL_TROUBLESHOOTING.md)
- Upload the sketch to Arduino from Arduino IDE

### No Data Appearing
- Check serial monitor output from Arduino
- Verify sensor wiring (AM2302, hydrometers, etc.)
- Check that Arduino sketch has been uploaded

### Database Issues
- Delete `database.db` to reset and recreate schema
- Check file permissions in the application directory

## Future Enhancements
- Authentication/user management
- Configuration panel for setpoints
- Alert notifications via email/SMS
- Data export (CSV)
- Mobile app interface
- PID control for fan/watering
- Network-based data logging

## License
MIT License

## Author
Auto Farm Project
