"""Test data generator for auto-farm (no Arduino needed)."""
import sqlite3
from datetime import datetime, timedelta
import random
from models import db, SensorData
from app import app

def generate_test_data(days=7):
    """
    Generate realistic greenhouse sensor data for testing.
    
    Args:
        days: Number of days of historical data to generate
    """
    with app.app_context():
        # Create tables if they don't exist
        db.create_all()
        
        # Clear existing data
        SensorData.query.delete()
        db.session.commit()
        
        print("Generating test data...")
        
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(days=days)
        
        current_time = start_time
        
        # Generate a data point every minute
        while current_time <= end_time:
            # Simulate realistic sensor values with some variation
            temp_base = 75 + 5 * random.gauss(0, 1)  # Around 75°F
            temp_f = max(50, min(100, temp_base))  # Clamp between 50-100
            
            humidity_base = 65 + 10 * random.gauss(0, 1)  # Around 65%
            humidity = max(20, min(100, humidity_base))  # Clamp between 20-100
            
            moisture_a = max(0, min(100, 70 + 15 * random.gauss(0, 1)))
            moisture_b = max(0, min(100, 72 + 15 * random.gauss(0, 1)))
            
            # Fan signal varies based on temperature and humidity
            temp_deviation = max(0, temp_f - 80) / 5
            humidity_deviation = max(0, humidity - 75) / 15
            fan_signal = max(temp_deviation, humidity_deviation) * 255
            fan_signal = int(max(0, min(255, fan_signal)))
            
            # Create sensor data entry
            data = SensorData(
                timestamp=current_time,
                temp_f=round(temp_f, 2),
                fan_signal=fan_signal,
                hydrometer_a=round(moisture_a, 2),
                hydrometer_b=round(moisture_b, 2),
                humidity=round(humidity, 2)
            )
            
            db.session.add(data)
            current_time += timedelta(minutes=1)
        
        db.session.commit()
        
        # Count entries
        count = SensorData.query.count()
        print(f"✓ Generated {count} test data points ({days} days of data)")
        print(f"  Time range: {start_time.isoformat()} to {end_time.isoformat()}")
        print("\nYou can now:")
        print("1. Run: python app.py")
        print("2. Visit: http://127.0.0.1:5000/chart")
        print("3. Set date range and click 'Load Data' to see the charts")

if __name__ == '__main__':
    generate_test_data(days=7)
