document.addEventListener('DOMContentLoaded', function() {
    function updateData() {
        fetch('/api/data')
            .then(response => response.json())
            .then(data => {
                document.getElementById('temp').textContent     = (typeof data.temp_f    === 'number') ? data.temp_f.toFixed(1)    : '--';
                document.getElementById('humidity').textContent = (typeof data.humidity   === 'number') ? data.humidity.toFixed(1)  : '--';
                document.getElementById('hyd_a').textContent    = (typeof data.hydrometer_a === 'number') ? Math.round(data.hydrometer_a) : (data.hydrometer_a || '--');
                document.getElementById('hyd_b').textContent    = (typeof data.hydrometer_b === 'number') ? Math.round(data.hydrometer_b) : (data.hydrometer_b || '--');
                document.getElementById('fan').textContent      = (typeof data.fan_signal === 'number') ? Math.round(data.fan_signal) : (data.fan_signal || '--');
            });
    }

    function updateDbInfo() {
        fetch('/api/db_info')
            .then(response => response.json())
            .then(data => {
                document.getElementById('record-count').textContent = data.record_count || '--';
                let sizeMB = data.db_size ? (data.db_size / (1024 * 1024)).toFixed(2) + ' MB' : '--';
                document.getElementById('db-size').textContent = sizeMB;
            });
    }

    function updateLatestImage() {
        fetch('/api/camera/latest')
            .then(response => response.json())
            .then(data => {
                const imgEl = document.getElementById('latest-image');
                const infoEl = document.getElementById('latest-image-info');
                if (data && data.filename) {
                    imgEl.src = `/camera/images/${data.filename}`;
                    infoEl.textContent = `Captured: ${new Date(data.timestamp).toLocaleString()} | Size: ${(data.size/1024).toFixed(1)} KB`;
                } else {
                    imgEl.src = '';
                    infoEl.textContent = 'No image available.';
                }
            })
            .catch(() => {
                const imgEl = document.getElementById('latest-image');
                const infoEl = document.getElementById('latest-image-info');
                imgEl.src = '';
                infoEl.textContent = 'No image available.';
            });
    }

    // --- Next watering countdown ---
    let nextWaterMs = null;
    let scheduleEnabled = true;

    function loadWateringSchedule() {
        fetch('/api/watering/schedule')
            .then(r => r.json())
            .then(data => {
                scheduleEnabled = data.enabled;
                if (!scheduleEnabled) {
                    nextWaterMs = null;
                    return;
                }
                if (data.last_watered) {
                    nextWaterMs = new Date(data.last_watered).getTime() + data.interval_hours * 3600 * 1000;
                } else {
                    nextWaterMs = null;
                }
            })
            .catch(() => {});
    }

    function updateWateringCountdown() {
        const el = document.getElementById('next-water-countdown');
        if (!el) return;
        if (!scheduleEnabled) { el.textContent = 'Disabled'; return; }
        if (nextWaterMs === null) { el.textContent = 'Not yet watered'; return; }
        const remaining = nextWaterMs - Date.now();
        if (remaining <= 0) {
            el.textContent = 'Any moment now';
            return;
        }
        const totalSec = Math.floor(remaining / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        el.textContent = (h > 0 ? h + 'h ' : '') + (h > 0 || m > 0 ? m + 'm ' : '') + s + 's';
    }

    loadWateringSchedule();
    setInterval(loadWateringSchedule, 60000);
    setInterval(updateWateringCountdown, 1000);
    // ---

    setInterval(updateData, 1000);
    updateData();

    setInterval(updateDbInfo, 10000);  // Update every 10 seconds
    updateDbInfo();

    setInterval(updateLatestImage, 10000); // Update image every 10 seconds
    updateLatestImage();
});