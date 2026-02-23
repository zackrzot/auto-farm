"""
Diagnostic tool for serial port access issues.
Use this to troubleshoot COM port problems.
"""
import serial
import serial.tools.list_ports
import sys
from serial import SerialException

def check_ports():
    """List all available COM ports with detailed info."""
    print("=" * 60)
    print("Available COM Ports:")
    print("=" * 60)
    
    ports = serial.tools.list_ports.comports()
    
    if not ports:
        print("No COM ports found!")
        return False
    
    for idx, port in enumerate(ports, 1):
        print(f"\n{idx}. {port.device}")
        print(f"   Description: {port.description}")
        print(f"   Hardware ID: {port.hwid}")
        
        # Try to access the port
        print(f"   Access test: ", end="")
        try:
            ser = serial.Serial(port.device, 9600, timeout=1)
            print("OK (accessible)")
            ser.close()
        except PermissionError:
            print("PERMISSION DENIED")
        except SerialException as e:
            print(f"ERROR: {e}")
        except Exception as e:
            print(f"{type(e).__name__}: {e}")
    
    return True

def test_specific_port(port_name):
    """Test access to a specific port."""
    print(f"\n\nTesting port: {port_name}")
    print("=" * 60)
    
    try:
        print("Attempting to open port... ", end="")
        ser = serial.Serial(port_name, 9600, timeout=1)
        print("SUCCESS")
        print(f"Port is open: {ser.is_open}")
        ser.close()
        print("Port closed successfully")
        return True
    except PermissionError as e:
        print(f"PERMISSION ERROR: {e}")
        print("\nSolutions:")
        print("1. Close other applications using this port (Arduino IDE, etc.)")
        print("2. Run Command Prompt as Administrator")
        print("3. Unplug and replug the USB cable")
        print("4. Check Device Manager for driver issues")
        return False
    except serial.SerialException as e:
        print(f"SERIAL ERROR: {e}")
        return False
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {e}")
        return False

if __name__ == '__main__':
    print("\nSerial Port Diagnostic Tool\n")
    
    # Always show available ports
    check_ports()
    
    # If specific port provided, test it
    if len(sys.argv) > 1:
        test_specific_port(sys.argv[1])
    else:
        print("\n\nUsage: python serial_diagnostic.py [COM_PORT]")
        print("Example: python serial_diagnostic.py COM3")
