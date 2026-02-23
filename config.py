# auto-farm Configuration

# Serial Port Configuration
SERIAL_PORT = 'COM3'        # Change to your Arduino's port
BAUD_RATE = 9600

# Flask Configuration
DEBUG = True
HOST = '127.0.0.1'
PORT = 5000

# Database Configuration
DATABASE_URI = 'sqlite:///database.db'

# Control Setpoints
TARGET_TEMP_F = 80.0        # Target temperature in Fahrenheit
TARGET_HUMIDITY = 75.0      # Target humidity percentage
MIN_WATER_TEMP = 70.0       # Minimum temperature to allow watering

# Watering Control
VALVE_ON_MOISTURE = 75.0    # Soil moisture % to trigger watering
VALVE_OFF_MOISTURE = 99.0   # Soil moisture % to stop watering

# Fan Control
TEMP_RANGE = 5.0            # Temperature range above target for fan control
HUMIDITY_RANGE = 15.0       # Humidity range above target for fan control

# Data Logging
LOG_INTERVAL_MS = 200       # Milliseconds between sensor reads on Arduino
LOG_READS_PER_SEND = 6      # Number of reads before sending to Flask
