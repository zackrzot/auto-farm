document.addEventListener('DOMContentLoaded', function() {
    function updateData() {
        fetch('/api/data')
            .then(response => response.json())
            .then(data => {
                document.getElementById('temp').textContent = data.temp_f || '--';
                document.getElementById('humidity').textContent = data.humidity || '--';
                document.getElementById('hyd_a').textContent = (typeof data.hydrometer_a === 'number') ? Math.round(data.hydrometer_a) : (data.hydrometer_a || '--');
                document.getElementById('hyd_b').textContent = (typeof data.hydrometer_b === 'number') ? Math.round(data.hydrometer_b) : (data.hydrometer_b || '--');
                document.getElementById('fan').textContent = (typeof data.fan_signal === 'number') ? Math.round(data.fan_signal) : (data.fan_signal || '--');
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

    setInterval(updateData, 1000);
    updateData();

    setInterval(updateDbInfo, 10000);  // Update every 10 seconds
    updateDbInfo();

    setInterval(updateLatestImage, 10000); // Update image every 10 seconds
    updateLatestImage();
});