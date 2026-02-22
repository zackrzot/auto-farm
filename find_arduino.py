"""Arduino port detection utility."""
import serial.tools.list_ports

def find_arduino_port():
    """
    Automatically find Arduino COM port.
    Returns the port or None if not found.
    """
    ports = serial.tools.list_ports.comports()
    
    for port in ports:
        # Look for Arduino-related ports
        if 'Arduino' in port.description or 'CH340' in port.description or port.description.startswith('USB'):
            print(f"Found Arduino at: {port.device}")
            return port.device
    
    return None

def list_available_ports():
    """List all available COM ports."""
    ports = serial.tools.list_ports.comports()
    if not ports:
        print("No COM ports found")
        return
    
    print("Available COM ports:")
    for port in ports:
        print(f"  {port.device}: {port.description}")

if __name__ == '__main__':
    print("Arduino Port Detector")
    print("-" * 40)
    list_available_ports()
    print()
    arduino_port = find_arduino_port()
    if arduino_port:
        print(f"\nAuto-detected Arduino: {arduino_port}")
        print(f"Update SERIAL_PORT = '{arduino_port}' in app.py")
    else:
        print("\nNo Arduino detected. Please check connection and try again.")
