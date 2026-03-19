let currentView = 'student'; 
let allData = [];
let pendingTimeoutId = null; 

// Master Lists loaded from DB
let masterSymptoms = [];
let masterMedicines = [];

let timeoutData = {
    blood_pressure: null,
    consideration: null,
    cert_status: null,
    hold_reason: null,
    symptoms: [],
    medicines: []
};

function formatTime(timeString) {
    if (!timeString || timeString === '00:00:00') return null;
    let [hours, minutes] = timeString.split(':');
    let ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
}

// --- FETCH MASTER LISTS FOR MODALS ---
async function loadMasterLists() {
    try {
        const sympRes = await fetch('/api/symptoms');
        masterSymptoms = await sympRes.json();
        renderSymptomsTable(masterSymptoms);

        const medRes = await fetch('/api/medicines');
        masterMedicines = await medRes.json();
        renderMedicinesTable(masterMedicines);
    } catch (error) {
        console.error("Error loading master lists:", error);
    }
}

function renderSymptomsTable(data) {
    const tbody = document.getElementById('symptomsTableBody');
    tbody.innerHTML = '';
    data.forEach((item, index) => {
        tbody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${item.symp_name}</td>
                <td><input type="checkbox" name="symptom" value="${item.symp_name}"></td>
            </tr>
        `;
    });
}

function renderMedicinesTable(data) {
    const tbody = document.getElementById('medicinesTableBody');
    tbody.innerHTML = '';
    data.forEach((item, index) => {
        const brand = item.brand_name ? item.brand_name : '';
        tbody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${item.generic_name}</td>
                <td class="brand-cell">${brand}</td>
                <td><input type="text" class="med-input"></td>
                <td><input type="text" class="med-input"></td>
                <td><input type="checkbox" name="medicine" value="${item.generic_name}"></td>
            </tr>
        `;
    });
}

// --- FETCH ACTIVE VISITS TABLE ---
async function fetchData() {
    let endpoint;
    if (currentView === 'student') endpoint = '/api/active-student-visits';
    else if (currentView === 'employee') endpoint = '/api/active-employee-visits';
    else endpoint = '/api/active-visitor-visits';

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
        
        let idValue;
        if (currentView === 'student') idValue = row.srcode;
        else if (currentView === 'employee') idValue = row.employee_id;
        else idValue = row.idNo;

        const visitId = row.visit_id; 

        let purposeValue = "";
        if (currentView === 'student') {
            if (row.purpose_medical_consult === 1) purposeValue = "Medical Consult";
            else if (row.purpose_blood_pressure === 1) purposeValue = "Blood Pressure";
            else if (row.purpose_med_cert === 1) purposeValue = "Medical Certificate";
            else if (row.purpose_pre_enrolment === 1) purposeValue = "Pre-enrolment";
        } else if (currentView === 'employee') {
            purposeValue = row.purpose_of_visit;
        } else {
            purposeValue = row.purpose;
        }

        const displayTimeIn = formatTime(row.time_in);
        const displayTimeOut = formatTime(row.time_out);

        const timeOutColumn = displayTimeOut ? displayTimeOut : `<button class="timeout-btn" onclick="initiateTimeOut('${visitId}', '${purposeValue}')">Time out</button>`;

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

// --- WORKFLOW LOGIC ---

function initiateTimeOut(id, purpose) {
    pendingTimeoutId = id;
    timeoutData = { blood_pressure: null, consideration: null, cert_status: null, hold_reason: null, symptoms: [], medicines: [] };
    
    // SAFE CHECK: Ensure purpose is a valid string before checking it
    const p = (typeof purpose === 'string') ? purpose.toLowerCase().trim() : "";

    console.log("Triggering Timeout for ID:", id, "Purpose:", p); // Helpful for debugging

    if (p.includes("medical consult") || p.includes("medicine")) {
        showModal('diagnosedModal');
    } else if (p.includes("blood pressure")) {
        showModal('bpModal');
    } else if (p.includes("medical certificate")) {
        document.getElementById('statusModalHeader').textContent = "Status of Medical Certificate:";
        showModal('statusModal');
    } else if (p.includes("pre-enrolment") || p.includes("enrolment")) {
        document.getElementById('statusModalHeader').textContent = "Status of Pre-enrolment:";
        showModal('statusModal');
    } else {
        // If purpose is blank, "Others", "Dental", etc. -> Timeout immediately
        executeFinalTimeOut();
    }
}

// Medical Consult Flow
function handleDiagnosedNo() {
    closeAllModals();
    executeFinalTimeOut();
}

function handleDiagnosedYes() {
    closeAllModals();
    showModal('symptomsModal');
}

function submitSymptoms() {
    const checkboxes = document.querySelectorAll('input[name="symptom"]:checked');
    checkboxes.forEach(cb => timeoutData.symptoms.push(cb.value));
    timeoutData.consideration = document.getElementById('considerationSelect').value || null;

    checkboxes.forEach(cb => cb.checked = false);
    document.getElementById('considerationSelect').value = "";

    closeAllModals();
    showModal('medicineQuestionModal');
}

function handleMedicineNo() {
    closeAllModals();
    executeFinalTimeOut();
}

function handleMedicineYes() {
    closeAllModals();
    showModal('medicineListModal');
}

function submitMedicine() {
    const checkboxes = document.querySelectorAll('input[name="medicine"]:checked');
    checkboxes.forEach(cb => {
        const tr = cb.closest('tr');
        const generic = cb.value;
        const brand = tr.querySelector('.brand-cell').innerText;
        const inputs = tr.querySelectorAll('.med-input');
        const quantity = inputs[0].value || null;
        const pieces = inputs[1].value || null;

        timeoutData.medicines.push({ generic, brand, quantity, pieces });
    });

    checkboxes.forEach(cb => {
        cb.checked = false;
        const tr = cb.closest('tr');
        tr.querySelectorAll('.med-input').forEach(input => input.value = '');
    });

    closeAllModals();
    executeFinalTimeOut();
}

// Blood Pressure Flow
function submitBP() {
    const bp = document.getElementById('bpInput').value.trim();
    if (!bp) {
        alert("Please enter a BP reading.");
        return;
    }
    timeoutData.blood_pressure = bp;
    document.getElementById('bpInput').value = '';
    
    closeAllModals();
    executeFinalTimeOut();
}

// Status Flow 
function toggleHoldOptions(show) {
    document.getElementById('holdOptions').style.display = show ? 'flex' : 'none';
}

function submitStatus() {
    const status = document.querySelector('input[name="certStatus"]:checked');
    if (!status) {
        alert("Please select Claimed or On-Hold.");
        return;
    }
    timeoutData.cert_status = status.value;

    if (status.value === "On-Hold") {
        const holdReason = document.querySelector('input[name="holdReason"]:checked');
        if (!holdReason) {
            alert("Please select a reason for On-Hold.");
            return;
        }
        timeoutData.hold_reason = holdReason.value;
    }

    document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
    document.getElementById('holdOptions').style.display = 'none';
    
    closeAllModals();
    executeFinalTimeOut();
}

// --- FINAL API CALL ---
async function executeFinalTimeOut() {
    if (!pendingTimeoutId) return;

    let endpoint;
    if (currentView === 'student') endpoint = `/api/timeout-student/${pendingTimeoutId}`;
    else if (currentView === 'employee') endpoint = `/api/timeout-employee/${pendingTimeoutId}`;
    else endpoint = `/api/timeout-visitor/${pendingTimeoutId}`;

    try {
        const response = await fetch(endpoint, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(timeoutData) 
        });
        
        if (response.ok) {
            pendingTimeoutId = null;
            fetchData(); 
        } else {
            alert("Error processing timeout.");
        }
    } catch (error) {
        console.error("Error timing out:", error);
    }
}

// --- MODAL UTILITIES & SEARCH ---
function showModal(modalId) {
    document.getElementById('modalOverlay').style.display = 'block';
    document.getElementById(modalId).style.display = 'block';
}

function closeAllModals() {
    document.getElementById('modalOverlay').style.display = 'none';
    const modals = document.querySelectorAll('.custom-modal');
    modals.forEach(m => m.style.display = 'none');
}

// Search for Symptoms Modal
document.getElementById('symptomSearch').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = masterSymptoms.filter(item => item.symp_name.toLowerCase().includes(term));
    renderSymptomsTable(filtered);
});

// Search for Medicines Modal
document.getElementById('medicineSearch').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = masterMedicines.filter(item => {
        const gen = item.generic_name ? item.generic_name.toLowerCase() : '';
        const brand = item.brand_name ? item.brand_name.toLowerCase() : '';
        return gen.includes(term) || brand.includes(term);
    });
    renderMedicinesTable(filtered);
});

// --- VIEW TOGGLES (UPDATED) ---
const viewStudentBtn = document.getElementById('viewStudentBtn');
const viewEmployeeBtn = document.getElementById('viewEmployeeBtn');
const viewVisitorBtn = document.getElementById('viewVisitorBtn');

function switchTab(viewType, title, header) {
    currentView = viewType;
    document.getElementById('formTitle').textContent = `Time Out Form (${title})`;
    document.getElementById('idHeader').textContent = header;
    
    // Manage active states
    viewStudentBtn.classList.remove('active-toggle');
    viewEmployeeBtn.classList.remove('active-toggle');
    viewVisitorBtn.classList.remove('active-toggle');

    if (viewType === 'student') viewStudentBtn.classList.add('active-toggle');
    if (viewType === 'employee') viewEmployeeBtn.classList.add('active-toggle');
    if (viewType === 'visitor') viewVisitorBtn.classList.add('active-toggle');

    fetchData();
}

viewStudentBtn.addEventListener('click', () => switchTab('student', 'Students', 'SR-Code'));
viewEmployeeBtn.addEventListener('click', () => switchTab('employee', 'Employees', 'ID Number'));
viewVisitorBtn.addEventListener('click', () => switchTab('visitor', 'Visitors', 'ID No.'));


// Main Search
document.getElementById('searchInput').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allData.filter(item => {
        let idToSearch = "";
        if (currentView === 'student') idToSearch = item.srcode;
        else if (currentView === 'employee') idToSearch = item.employee_id;
        else idToSearch = item.idNo;

        return (idToSearch && idToSearch.toLowerCase().includes(term)) || 
               (item.fullname && item.fullname.toLowerCase().includes(term));
    });
    renderTable(filtered);
});

// Load everything on start
document.addEventListener('DOMContentLoaded', () => {
    loadMasterLists();
    fetchData();
});