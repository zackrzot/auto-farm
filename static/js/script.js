document.addEventListener('DOMContentLoaded', function() {
    function updateData() {
        fetch('/api/data')
            .then(response => response.json())
            .then(data => {
                document.getElementById('temp').textContent = data.temp_f || '--';
                document.getElementById('humidity').textContent = data.humidity || '--';
                document.getElementById('hyd_a').textContent = data.hydrometer_a || '--';
                document.getElementById('hyd_b').textContent = data.hydrometer_b || '--';
                document.getElementById('fan').textContent = data.fan_signal || '--';
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

    setInterval(updateData, 1000);
    updateData();

    setInterval(updateDbInfo, 10000);  // Update every 10 seconds
    updateDbInfo();

    document.getElementById('water_on').addEventListener('click', () => sendCommand('W1'));
    document.getElementById('water_off').addEventListener('click', () => sendCommand('W0'));
    document.getElementById('auto').addEventListener('click', () => sendCommand('A'));
    document.getElementById('set_fan').addEventListener('click', () => {
        const speed = document.getElementById('fan_speed').value;
        sendCommand(`F:${speed}`);
    });

    function sendCommand(cmd) {
        fetch('/api/control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: cmd })
        });
    }
});