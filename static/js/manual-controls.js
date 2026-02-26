// manual-controls.js

function triggerDevice(device, action) {
    let command;
    switch (device) {
        case 'valve':
            command = (action === 'open') ? 'W1' : 'W0';
            break;
        case 'fan':
            command = (action === 'on') ? 'F:255' : 'F:0';
            break;
        case 'lights':
            command = (action === 'on') ? 'L1' : 'L0';
            break;
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
