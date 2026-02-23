document.addEventListener('DOMContentLoaded', function() {
    const chartEl = document.getElementById('chart');
    if (!chartEl) return;
    
    const ctx = chartEl.getContext('2d');
    let chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Temperature (°F)',
                    data: [],
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.05)',
                    tension: 0.1,
                    fill: false
                },
                {
                    label: 'Humidity (%)',
                    data: [],
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.05)',
                    tension: 0.1,
                    fill: false
                },
                {
                    label: 'Soil Moisture A (%)',
                    data: [],
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.05)',
                    tension: 0.1,
                    fill: false
                },
                {
                    label: 'Soil Moisture B (%)',
                    data: [],
                    borderColor: '#ffc107',
                    backgroundColor: 'rgba(255, 193, 7, 0.05)',
                    tension: 0.1,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        font: { size: 11 }
                    }
                },
                x: {
                    display: true,
                    ticks: {
                        font: { size: 11 }
                    }
                }
            }
        }
    });

    document.getElementById('load').addEventListener('click', function() {
        const start = document.getElementById('start').value;
        const end = document.getElementById('end').value;
        
        if (!start || !end) {
            alert('Please select both start and end dates');
            return;
        }
        
        fetch(`/api/history?start=${start}&end=${end}`)
            .then(r => r.json())
            .then(data => {
                if (!Array.isArray(data) || data.length === 0) {
                    alert('No data found for the selected date range');
                    return;
                }
                
                chart.data.labels = data.map(d => new Date(d.timestamp).toLocaleString());
                chart.data.datasets[0].data = data.map(d => d.temp_f);
                chart.data.datasets[1].data = data.map(d => d.humidity);
                chart.data.datasets[2].data = data.map(d => d.hydrometer_a);
                chart.data.datasets[3].data = data.map(d => d.hydrometer_b);
                chart.update();
            })
            .catch(err => {
                alert('Error loading data: ' + err);
                console.error(err);
            });
    });
});
