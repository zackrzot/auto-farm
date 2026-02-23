let chart = null;
let currentDate = new Date();
let selectedDate = null;
let datesWithData = [];

// Initialize chart
function initChart() {
    const chartEl = document.getElementById('chart');
    if (!chartEl) return;
    
    const ctx = chartEl.getContext('2d');
    chart = new Chart(ctx, {
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
}

// Render calendar for current month
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Update month/year header
    const monthYear = document.getElementById('monthYear');
    monthYear.textContent = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    // Load available dates for this month
    loadAvailableDates(year, month + 1);
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const calendar = document.getElementById('calendar');
    calendar.innerHTML = '';
    
    // Add previous month's days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const dayCell = createDayCell(day, true);
        calendar.appendChild(dayCell);
    }
    
    // Add current month's days
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const isToday = (
            today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === day
        );
        const dayCell = createDayCell(day, false, isToday);
        dayCell.addEventListener('click', () => selectDay(year, month, day));
        calendar.appendChild(dayCell);
    }
    
    // Add next month's days
    const totalCells = calendar.children.length;
    const remainingCells = 42 - totalCells; // 6 rows × 7 days
    for (let day = 1; day <= remainingCells; day++) {
        const dayCell = createDayCell(day, true);
        calendar.appendChild(dayCell);
    }
}

// Create a day cell element
function createDayCell(day, isOtherMonth = false, isToday = false) {
    const cell = document.createElement('div');
    cell.className = 'day-cell';
    cell.textContent = day;
    
    if (isOtherMonth) {
        cell.classList.add('other-month');
    } else if (isToday) {
        cell.classList.add('today');
    }
    
    return cell;
}

// Load available dates for a month from the API
async function loadAvailableDates(year, month) {
    try {
        const response = await fetch(`/api/available-dates?year=${year}&month=${month}`);
        const data = await response.json();
        
        if (data.dates) {
            datesWithData = data.dates;
            updateCalendarWithData();
        }
    } catch (error) {
        console.error('Error loading available dates:', error);
    }
}

// Update calendar to mark days with data
function updateCalendarWithData() {
    const calendar = document.getElementById('calendar');
    const cells = calendar.querySelectorAll('.day-cell:not(.other-month)');
    
    cells.forEach((cell, index) => {
        const day = parseInt(cell.textContent);
        if (datesWithData.includes(day)) {
            cell.classList.add('has-data');
        }
    });
}

// Select a day and load its data
function selectDay(year, month, day) {
    // Update selected state in calendar
    const calendar = document.getElementById('calendar');
    calendar.querySelectorAll('.day-cell').forEach(cell => cell.classList.remove('selected'));
    
    // Find and mark the selected cell
    const cells = calendar.querySelectorAll('.day-cell:not(.other-month)');
    cells.forEach((cell) => {
        if (parseInt(cell.textContent) === day) {
            cell.classList.add('selected');
        }
    });
    
    // Create date string for the selected day
    selectedDate = new Date(year, month, day);
    
    // Update selected day info
    const selectedDayInfo = document.getElementById('selectedDayInfo');
    selectedDayInfo.innerHTML = `
        <p>Selected date:</p>
        <div class="date-display">${selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
    `;
    
    // Load data for this day
    loadDayData(year, month, day);
}

// Load data for a specific day
async function loadDayData(year, month, day) {
    try {
        // Create start and end timestamps for the selected day
        const start = new Date(year, month, day, 0, 0, 0).toISOString();
        const end = new Date(year, month, day, 23, 59, 59).toISOString();
        
        const response = await fetch(`/api/history?start=${start}&end=${end}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`API Error ${response.status}:`, errorText);
            throw new Error(`API returned ${response.status}: ${errorText.substring(0, 100)}`);
        }
        
        const data = await response.json();
        
        if (!Array.isArray(data) || data.length === 0) {
            document.getElementById('noDataMessage').style.display = 'block';
            if (chart) {
                chart.data.labels = [];
                chart.data.datasets.forEach(dataset => dataset.data = []);
                chart.update();
            }
            return;
        }
        
        document.getElementById('noDataMessage').style.display = 'none';
        
        // Update chart with selected day's data
        if (chart) {
            chart.data.labels = data.map(d => {
                const time = new Date(d.timestamp).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit'
                });
                return time;
            });
            chart.data.datasets[0].data = data.map(d => d.temp_f);
            chart.data.datasets[1].data = data.map(d => d.humidity);
            chart.data.datasets[2].data = data.map(d => d.hydrometer_a);
            chart.data.datasets[3].data = data.map(d => d.hydrometer_b);
            chart.update();
        }
    } catch (error) {
        console.error('Error loading day data:', error);
        document.getElementById('noDataMessage').style.display = 'block';
        alert('Error loading data for selected day:\n' + error.message);
    }
}

// Month navigation
document.addEventListener('DOMContentLoaded', function() {
    initChart();
    renderCalendar();
    
    document.getElementById('prevMonth').addEventListener('click', function() {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });
    
    document.getElementById('nextMonth').addEventListener('click', function() {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });
});
