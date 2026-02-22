document.addEventListener('DOMContentLoaded', function() {
    const ctx = document.getElementById('chart').getContext('2d');
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

    document.getElementById('load').addEventListener('click', function() {
        const start = document.getElementById('start').value;
        const end = document.getElementById('end').value;
        fetch(`/api/history?start=${start}&end=${end}`)
            .then(response => response.json())
            .then(data => {
                const labels = data.map(d => new Date(d.timestamp));
                chart.data.labels = labels;
                chart.data.datasets[0].data = data.map(d => ({ x: new Date(d.timestamp), y: d.temp_f }));
                chart.data.datasets[1].data = data.map(d => ({ x: new Date(d.timestamp), y: d.humidity }));
                chart.data.datasets[2].data = data.map(d => ({ x: new Date(d.timestamp), y: d.hydrometer_a }));
                chart.data.datasets[3].data = data.map(d => ({ x: new Date(d.timestamp), y: d.hydrometer_b }));
                chart.data.datasets[4].data = data.map(d => ({ x: new Date(d.timestamp), y: d.fan_signal }));
                chart.update();
            });
    });
});