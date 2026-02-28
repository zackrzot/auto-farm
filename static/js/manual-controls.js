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
            const fan    = 'F:' + data.fan_speed;
            const active = (data.triggers || [])
                .filter(t => t.active)
                .map(t => t.name)
                .join(', ') || 'none';
            showToast(`Reset applied — Fan: ${fan}. Active triggers: ${active}`, true);
        } else {
            showToast('Reset failed: ' + (data.message || 'unknown error'), false);
        }
    })
    .catch(() => showToast('Network error during reset', false));
}

// ── Watering Schedule ────────────────────────────────────────────────────────

function loadSchedule() {
    fetch('/api/watering/schedule')
        .then(r => r.json())
        .then(data => {
            document.getElementById('sched-duration').value = data.duration_seconds;
            document.getElementById('sched-interval').value = data.interval_hours;
            document.getElementById('sched-enabled').checked = data.enabled;

            const badge = document.getElementById('schedule-badge');
            badge.textContent = data.enabled ? 'Enabled' : 'Disabled';
            badge.className   = 'badge ms-1 ' + (data.enabled ? 'bg-success' : 'bg-secondary');

            const status = document.getElementById('sched-status');
            if (data.last_watered) {
                const last = new Date(data.last_watered);
                const nextMs = last.getTime() + data.interval_hours * 3600 * 1000;
                const next   = new Date(nextMs);
                status.textContent = `Last watered: ${last.toLocaleString()}  |  Next: ${next.toLocaleString()}`;
            } else {
                status.textContent = 'No watering events recorded yet.';
            }
        })
        .catch(() => {});
}

function loadWateringLog() {
    fetch('/api/watering/log')
        .then(r => r.json())
        .then(rows => {
            const table = document.getElementById('watering-log-table');
            const tbody = document.getElementById('watering-log-body');
            if (!rows.length) { table.style.display = 'none'; return; }
            tbody.innerHTML = rows.map(r => `
                <tr>
                    <td>${new Date(r.timestamp).toLocaleString()}</td>
                    <td>${r.duration_seconds}s</td>
                    <td>${r.triggered_by}</td>
                </tr>`).join('');
            table.style.display = '';
        })
        .catch(() => {});
}

function saveSchedule() {
    const payload = {
        enabled:          document.getElementById('sched-enabled').checked,
        duration_seconds: parseFloat(document.getElementById('sched-duration').value),
        interval_hours:   parseFloat(document.getElementById('sched-interval').value)
    };
    if (isNaN(payload.duration_seconds) || isNaN(payload.interval_hours)) {
        showToast('Invalid schedule values.', false);
        return;
    }
    fetch('/api/watering/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(r => r.json())
    .then(data => {
        if (data.status === 'ok') {
            showToast('Schedule saved.', true);
            loadSchedule();
        } else {
            showToast('Failed to save schedule.', false);
        }
    })
    .catch(() => showToast('Network error saving schedule.', false));
}

function waterNow() {
    fetch('/api/watering/run', { method: 'POST' })
        .then(r => r.json())
        .then(data => {
            if (data.status === 'ok') {
                showToast(`Watering started — valve open for ${data.duration_seconds}s.`, true);
                setTimeout(() => { loadSchedule(); loadWateringLog(); }, (data.duration_seconds + 1) * 1000);
            } else {
                showToast('Failed to start watering.', false);
            }
        })
        .catch(() => showToast('Network error.', false));
}

// Init on page load
document.addEventListener('DOMContentLoaded', () => {
    loadSchedule();
    loadWateringLog();
});
