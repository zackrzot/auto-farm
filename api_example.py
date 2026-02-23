"""
Example usage of the auto-farm API.
This demonstrates how to interact with the Flask app programmatically.
"""

import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://127.0.0.1:5000"

def get_current_data():
    """Get the latest sensor readings."""
    response = requests.get(f"{BASE_URL}/api/data")
    data = response.json()
    print("Current Sensor Data:")
    print(f"  Temperature: {data.get('temp_f', 'N/A')}°F")
    print(f"  Humidity: {data.get('humidity', 'N/A')}%")
    print(f"  Soil Moisture A: {data.get('hydrometer_a', 'N/A')}%")
    print(f"  Soil Moisture B: {data.get('hydrometer_b', 'N/A')}%")
    print(f"  Fan Signal: {data.get('fan_signal', 'N/A')}")
    return data

def control_water(action):
    """
    Control watering system.
    
    Args:
        action: 'on' or 'off'
    """
    cmd = 'W1' if action.lower() == 'on' else 'W0'
    response = requests.post(
        f"{BASE_URL}/api/control",
        json={"command": cmd}
    )
    print(f"Water {action}: {response.json()}")

def control_fan(speed):
    """
    Set fan speed manually.
    
    Args:
        speed: 0-255 (0=off, 255=max)
    """
    if not 0 <= speed <= 255:
        print("Error: Fan speed must be 0-255")
        return
    
    response = requests.post(
        f"{BASE_URL}/api/control",
        json={"command": f"F:{speed}"}
    )
    print(f"Fan set to {speed}: {response.json()}")

def set_auto_mode():
    """Return to automatic control mode."""
    response = requests.post(
        f"{BASE_URL}/api/control",
        json={"command": "A"}
    )
    print(f"Auto mode: {response.json()}")

def get_historical_data(hours=24):
    """
    Get sensor data from the past N hours.
    
    Args:
        hours: Number of hours of history to retrieve
    """
    end = datetime.utcnow().isoformat()
    start = (datetime.utcnow() - timedelta(hours=hours)).isoformat()
    
    response = requests.get(
        f"{BASE_URL}/api/history",
        params={"start": start, "end": end}
    )
    
    data = response.json()
    print(f"Retrieved {len(data)} data points from the past {hours} hours")
    
    if data:
        # Print first and last entries
        print(f"\nFirst reading: {data[0]['timestamp']}")
        print(f"  Temp: {data[0]['temp_f']}°F, Humidity: {data[0]['humidity']}%")
        print(f"\nLast reading: {data[-1]['timestamp']}")
        print(f"  Temp: {data[-1]['temp_f']}°F, Humidity: {data[-1]['humidity']}%")
    
    return data

def example_automation_script():
    """Example automated control sequence."""
    print("=" * 50)
    print("auto-farm - Example Automation Script")
    print("=" * 50)
    
    # Get current conditions
    print("\n1. Checking current conditions...")
    data = get_current_data()
    
    # Example: If temperature is too high, boost fan
    temp = data.get('temp_f', 0)
    print(f"\n2. Temperature is {temp}°F")
    
    if temp > 85:
        print("   Temperature too high! Setting fan to 200...")
        control_fan(200)
    elif temp > 80:
        print("   Temperature slightly elevated. Setting fan to 150...")
        control_fan(150)
    else:
        print("   Temperature OK. Returning to auto mode...")
        set_auto_mode()
    
    # Example: Check last 24 hours of data
    print("\n3. Retrieving 24-hour history...")
    history = get_historical_data(hours=24)
    
    if history:
        temps = [d['temp_f'] for d in history]
        avg_temp = sum(temps) / len(temps)
        print(f"   Average temperature: {avg_temp:.1f}°F")
        print(f"   Min: {min(temps):.1f}°F, Max: {max(temps):.1f}°F")
    
    print("\n" + "=" * 50)
    print("Automation script complete!")
    print("=" * 50)

if __name__ == '__main__':
    try:
        # Uncomment examples below to run:
        
        # Get current data
        get_current_data()
        
        # Manual control examples:
        # control_water('on')
        # control_fan(128)
        # set_auto_mode()
        
        # Get historical data
        # get_historical_data(hours=1)
        
        # Run example automation
        # example_automation_script()
        
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to Flask app")
        print("Make sure the app is running: python app.py")
