#!/usr/bin/env python3
"""
find_webcam.py - Utility to detect available webcam devices
Helps identify which camera index to use for the auto-farm system
"""

import cv2

def find_available_webcams():
    """Scan for available webcam devices"""
    available_cameras = []
    
    # Check up to 10 camera indices (0-9)
    print("Scanning for available webcams...\n")
    
    for index in range(10):
        cap = cv2.VideoCapture(index)
        
        if cap.isOpened():
            # Try to capture a frame to verify the camera works
            ret, frame = cap.read()
            if ret and frame is not None:
                width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                fps = int(cap.get(cv2.CAP_PROP_FPS))
                
                camera_info = {
                    'index': index,
                    'resolution': f"{width}x{height}",
                    'fps': fps if fps > 0 else 'Unknown'
                }
                available_cameras.append(camera_info)
                
                print(f"✓ Camera {index}:")
                print(f"  Resolution: {width}x{height}")
                print(f"  FPS: {fps if fps > 0 else 'Unknown'}")
                print()
        
        cap.release()
    
    return available_cameras

def main():
    print("=" * 50)
    print("auto-farm Webcam Detector")
    print("=" * 50)
    print()
    
    try:
        cameras = find_available_webcams()
        
        if not cameras:
            print("❌ No webcams detected!")
            print("\nTroubleshooting:")
            print("  1. Ensure a webcam is connected to your system")
            print("  2. Check Device Manager to verify the camera is recognized")
            print("  3. Make sure no other application is using the camera")
            print("  4. Try unplugging and replugging the webcam USB cable")
            return 1
        
        print(f"\n✓ Found {len(cameras)} available webcam(s)")
        print("\nTo use a specific camera, run app.py with the --camera-index flag:")
        print("  python app.py --camera-index 0")
        print("  python app.py --camera-index 1  # for second camera")
        print("  python app.py --camera-index 2  # for third camera, etc.")
        return 0
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nMake sure OpenCV is installed:")
        print("  pip install opencv-python")
        return 1

if __name__ == '__main__':
    sys.exit(main())
