let liveChart = null;
let chartData = {
    labels: [],
    temps: [],
    humidities: [],
    fans: [],
    hydrometer_a: [],
    hydrometer_b: [],
    water_valve: []
};

function initChart() {
    const chartEl = document.getElementById('chart');
    if (!chartEl) {
        console.log('Chart element not found');
        return;
    }

    if (typeof Chart === 'undefined') {
        console.error('Chart.js not loaded yet');
        setTimeout(initChart, 500);
        return;
    }

    const ctx = chartEl.getContext('2d');
    
    liveChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [
                {
                    label: 'Temperature (\u00B0F)',
                    data: chartData.temps,
                    borderColor: 'rgb(220, 53, 69)',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 5
                },
                {
                    label: 'Humidity (%)',
                    data: chartData.humidities,
                    borderColor: 'rgb(13, 110, 253)',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 5
                },
                {
                    label: 'Fan Speed',
                    data: chartData.fans,
                    borderColor: 'rgb(111, 66, 193)',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 5
                },
                {
                    label: 'Water Valve',
                    data: chartData.water_valve,
                    borderColor: 'rgb(40, 167, 69)',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 5
                },
                {
                    label: 'Soil Moisture A',
                    data: chartData.hydrometer_a,
                    borderColor: 'rgb(255, 193, 7)',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 5
                },
                {
                    label: 'Soil Moisture B',
                    data: chartData.hydrometer_b,
                    borderColor: 'rgb(23, 162, 184)',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        padding: 15,
                        font: { size: 12 },
                        usePointStyle: true
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(0);
                        }
                    }
                },
                x: {
                    display: true,
                    ticks: {
                        maxRotation: 45,
                        minRotation: 0
                    }
                }
            }
        }
    });

    console.log('Chart initialized successfully');
}

function updateLiveChart(data) {
    if (!liveChart) return;
    const time = new Date(data.timestamp).toLocaleTimeString();
    chartData.labels.push(time);
    chartData.temps.push(parseFloat(data.temp_f) || 0);
    chartData.humidities.push(parseFloat(data.humidity) || 0);
    chartData.fans.push(parseFloat(data.fan_signal) || 0);
    chartData.hydrometer_a.push(parseFloat(data.hydrometer_a) || 0);
    chartData.hydrometer_b.push(parseFloat(data.hydrometer_b) || 0);
    // Water valve: 1 if either soil moisture low, else 0
    chartData.water_valve.push(((parseFloat(data.hydrometer_a) < 30) || (parseFloat(data.hydrometer_b) < 30)) ? 1 : 0);
    // Keep only last 60 points
    const maxPoints = 60;
    if (chartData.labels.length > maxPoints) {
        chartData.labels.shift();
        chartData.temps.shift();
        chartData.humidities.shift();
        chartData.fans.shift();
        chartData.hydrometer_a.shift();
        chartData.hydrometer_b.shift();
        chartData.water_valve.shift();
    }
    liveChart.data.labels = chartData.labels;
    liveChart.data.datasets[0].data = chartData.temps;
    liveChart.data.datasets[1].data = chartData.humidities;
    liveChart.data.datasets[2].data = chartData.fans;
    liveChart.data.datasets[3].data = chartData.water_valve;
    liveChart.data.datasets[4].data = chartData.hydrometer_a;
    liveChart.data.datasets[5].data = chartData.hydrometer_b;
    liveChart.update('none');
}

function fetchLiveData() {
    fetch('/api/data')
        .then(response => {
            if (!response.ok) {
                throw new Error('API error: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            if (data && data.timestamp) {
                updateLiveChart(data);
            }
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM loaded, initializing chart');
        initChart();
        
        // Start polling for data
        setInterval(fetchLiveData, 1000);
        
        // Fetch immediately on load
        fetchLiveData();
    });
} else {
    console.log('DOM already loaded, initializing chart immediately');
    initChart();
    setInterval(fetchLiveData, 1000);
    fetchLiveData();
}