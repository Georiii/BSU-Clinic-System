let currentView = 'student'; 
let allData = [];

// Helper: Convert 24h to 12h AM/PM
function formatTime(timeString) {
    if (!timeString || timeString === '00:00:00') return null;
    let [hours, minutes] = timeString.split(':');
    let ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
}

async function fetchData() {
    const endpoint = currentView === 'student' ? '/api/active-student-visits' : '/api/active-employee-visits';
    try {
        const response = await fetch(endpoint);
        allData = await response.json();
        renderTable(allData);
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

function renderTable(data) {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';
    data.forEach((row, index) => {
        const tr = document.createElement('tr');
        const idValue = currentView === 'student' ? row.srcode : row.employee_id;
        const visitId = row.visit_id; 

        // Format times for display
        const displayTimeIn = formatTime(row.time_in);
        const displayTimeOut = formatTime(row.time_out);

        // Simple Button logic: No pop-ups, just calls handleTimeOut immediately
        const timeOutColumn = displayTimeOut ? displayTimeOut : `<button class="timeout-btn" onclick="handleTimeOut('${visitId}')">Time out</button>`;

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${idValue}</td>
            <td>${row.fullname}</td>
            <td>${displayTimeIn}</td>
            <td>${timeOutColumn}</td>
        `;
        tableBody.appendChild(tr);
    });
}

// Immediate Timeout Logic (No modals)
async function handleTimeOut(id) {
    const endpoint = currentView === 'student' ? `/api/timeout-student/${id}` : `/api/timeout-employee/${id}`;
    try {
        const response = await fetch(endpoint, { method: 'POST' });
        if (response.ok) {
            fetchData(); // Refresh the table
        }
    } catch (error) {
        console.error("Error timing out:", error);
    }
}

// TOGGLE AND SEARCH
document.getElementById('toggleTableBtn').addEventListener('click', function() {
    currentView = currentView === 'student' ? 'employee' : 'student';
    this.textContent = currentView === 'student' ? 'Switch to Employee' : 'Switch to Student';
    document.getElementById('formTitle').textContent = `Time Out Form (${currentView === 'student' ? 'Students' : 'Employees'})`;
    document.getElementById('idHeader').textContent = currentView === 'student' ? 'SR-Code' : 'ID Number';
    fetchData();
});

document.getElementById('searchInput').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allData.filter(item => {
        const idToSearch = currentView === 'student' ? item.srcode : item.employee_id;
        return idToSearch.toLowerCase().includes(term) || item.fullname.toLowerCase().includes(term);
    });
    renderTable(filtered);
});

document.addEventListener('DOMContentLoaded', fetchData);