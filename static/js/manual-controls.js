// manual-controls.js

function triggerDevice(device, action) {
    let command;
    switch (device) {
        case 'valve':
            command = (action === 'open') ? 'W1' : 'W0';
            break;
        case 'fan':
            // Prompt user for speed value (0-255)
            let speed = 255;
            if (action === 'set') {
                speed = prompt('Enter fan speed (0-255):', '128');
                if (speed === null) return; // Cancelled
                speed = parseInt(speed, 10);
                if (isNaN(speed) || speed < 0 || speed > 255) {
                    alert('Invalid speed. Enter a value between 0 and 255.');
                    return;
                }
            } else {
                speed = (action === 'on') ? 255 : 0;
            }
            command = `F:${speed}`;
            break;
        // No lights control implemented
        default:
            alert('Unknown device');
            return;
    }
    fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'ok') {
            updateStatus(device, action);
        } else {
            alert('Failed to send command');
        }
    })
    .catch(() => alert('Error sending command'));
}

function updateStatus(device, action) {
    const statusSpan = document.getElementById(device + '-status');
    if (statusSpan) {
        statusSpan.textContent = 'Status: ' + (action.charAt(0).toUpperCase() + action.slice(1));
    }
}
