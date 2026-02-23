document.addEventListener('DOMContentLoaded', function() {
    const chartEl = document.getElementById('chart');
    if (!chartEl) return; // nothing to do on pages without a chart canvas
    const ctx = chartEl.getContext('2d');
    let chart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Temperature (°F)',
                data: [],
                borderColor: 'red',
                yAxisID: 'y'
            }, {
                label: 'Humidity (%)',
                data: [],
                borderColor: 'blue',
                yAxisID: 'y1'
            }, {
                label: 'Soil Moisture A (%)',
                data: [],
                borderColor: 'green',
                yAxisID: 'y1'
            }, {
                label: 'Soil Moisture B (%)',
                data: [],
                borderColor: 'orange',
                yAxisID: 'y1'
            }, {
                label: 'Fan Signal',
                data: [],
                borderColor: 'purple',
                yAxisID: 'y2'
            }]
        },
        options: {
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'minute'
                    }
                },
                y: {
                    type: 'linear',
                    position: 'left',
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    grid: {
                        drawOnChartArea: false,
                    },
                },
                y2: {
                    type: 'linear',
                    position: 'right',
                    grid: {
                        drawOnChartArea: false,
                    },
                }
            }
        }
    });

    // Live update: poll /api/data and append to datasets
    function pushPoint(d) {
        const t = new Date(d.timestamp);
        const maxPoints = 300;
        function addToDataset(idx, value) {
            chart.data.datasets[idx].data.push({ x: t, y: value });
            if (chart.data.datasets[idx].data.length > maxPoints) chart.data.datasets[idx].data.shift();
        }
        addToDataset(0, d.temp_f);
        addToDataset(1, d.humidity);
        addToDataset(2, d.hydrometer_a);
        addToDataset(3, d.hydrometer_b);
        addToDataset(4, d.fan_signal);
        chart.update('none');
    }

    // Seed with a short history if available
    fetch('/api/history?start=' + new Date(Date.now() - 5*60*1000).toISOString() + '&end=' + new Date().toISOString())
        .then(r => r.json())
        .then(data => {
            if (!Array.isArray(data) || data.length === 0) return;
            chart.data.datasets[0].data = data.map(d => ({ x: new Date(d.timestamp), y: d.temp_f }));
            chart.data.datasets[1].data = data.map(d => ({ x: new Date(d.timestamp), y: d.humidity }));
            chart.data.datasets[2].data = data.map(d => ({ x: new Date(d.timestamp), y: d.hydrometer_a }));
            chart.data.datasets[3].data = data.map(d => ({ x: new Date(d.timestamp), y: d.hydrometer_b }));
            chart.data.datasets[4].data = data.map(d => ({ x: new Date(d.timestamp), y: d.fan_signal }));
            chart.update();
        })
        .catch(() => {});

    setInterval(() => {
        fetch('/api/data')
            .then(r => r.json())
            .then(d => {
                if (d && d.timestamp) pushPoint(d);
            })
            .catch(() => {});
    }, 1000);
});