// manual-controls.js

function showToast(message, ok) {
    const el = document.getElementById('cmd-toast');
    if (!el) return;
    el.className = 'alert mb-3 ' + (ok ? 'alert-success' : 'alert-danger');
    el.textContent = message;
    el.classList.remove('d-none');
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => el.classList.add('d-none'), 3000);
}

function sendCommand(command) {
    fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
    })
    .then(r => r.json())
    .then(data => {
        if (data.status === 'ok') {
            showToast('Sent: ' + command, true);
        } else {
            showToast('Error sending: ' + command, false);
        }
    })
    .catch(() => showToast('Network error sending: ' + command, false));
}

function sendFanCustom() {
    const val = parseInt(document.getElementById('fan-custom-val').value, 10);
    if (isNaN(val) || val < 0 || val > 255) {
        showToast('Invalid speed. Enter a value between 0 and 255.', false);
        return;
    }
    sendCommand('F:' + val);
}

function resetToTriggers() {
    fetch('/api/control/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(r => r.json())
    .then(data => {
        if (data.status === 'ok') {
            const valve = data.valve_open ? 'Open (W1)' : 'Closed (W0)';
            const fan   = 'F:' + data.fan_speed;
            const active = (data.triggers || [])
                .filter(t => t.active)
                .map(t => t.name)
                .join(', ') || 'none';
            showToast(`Reset applied — Fan: ${fan}, Valve: ${valve}. Active triggers: ${active}`, true);
        } else {
            showToast('Reset failed: ' + (data.message || 'unknown error'), false);
        }
    })
    .catch(() => showToast('Network error during reset', false));
}
