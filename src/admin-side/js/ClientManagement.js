let currentTab = 'student';
let currentData = [];
let editingVisitId = null;

// Switch Tab Logic and Dynamic Filters
async function switchTab(tab, btnElement) {
    currentTab = tab;
    
    // Update active button styles
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');
    
    // Toggle Dynamic Filter UI visibility based on the active tab
    document.getElementById('filterDept').style.display = (tab === 'student') ? 'block' : 'none';
    document.getElementById('filterEmpDetails').style.display = (tab === 'employee') ? 'flex' : 'none';

    await loadData();
}

async function loadData() {
    try {
        const res = await fetch(`/api/clients/${currentTab}`);
        currentData = await res.json();
        renderTable(currentData);
    } catch (error) {
        console.error("Error loading data:", error);
    }
}

// Render Table (REPLACED EMOJIS WITH IMAGE ICONS)
function renderTable(data) {
    const tbody = document.getElementById('clientTableBody');
    tbody.innerHTML = '';
    
    data.forEach((row, index) => {
        let idVal = row.srcode || row.employee_id || row.idNo;
        let pillClass = row.dynamic_status === 'Completed' ? 'completed' : row.dynamic_status === 'In-Clinic' ? 'in-clinic' : 'on-hold';
        
        let purposeText = row.purpose || "Various"; 

        tbody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${idVal}</td>
                <td>${row.name}</td>
                <td>${purposeText}</td>
                <td><span class="pill ${pillClass}">${row.dynamic_status}</span></td>
                <td>
                    <img src="/images/view-icon.png" alt="View" class="action-icon" onclick="openViewModal(${row.visit_id})">
                    <img src="/images/edit-icon.png" alt="Edit" class="action-icon" onclick="openEditModal(${row.visit_id})">
                    <img src="/images/print-icon.png" alt="Print" class="action-icon">
                </td>
            </tr>
        `;
    });
}

// Modal Control Logic
function openModal(id) { 
    document.getElementById(id).style.display = 'flex'; 
}

function closeModal(id) { 
    document.getElementById(id).style.display = 'none'; 
}

// Close modals when clicking outside of them
window.onclick = function(e) { 
    if (e.target.classList.contains('modal')) {
        e.target.style.display = "none"; 
    }
}

function openViewModal(visitId) {
    const r = currentData.find(d => d.visit_id === visitId);
    
    document.getElementById('vName').textContent = r.name;
    document.getElementById('vId').textContent = r.srcode || r.employee_id || r.idNo;
    document.getElementById('vDate').textContent = new Date(r.visit_date).toLocaleDateString();
    document.getElementById('vTimeIn').textContent = r.time_in;
    document.getElementById('vTimeOut').textContent = r.time_out || 'N/A';
    document.getElementById('vAge').textContent = r.age || 'N/A';
    document.getElementById('vGender').textContent = r.gender || 'N/A';
    document.getElementById('vConfined').textContent = r.is_confined || 'No';
    document.getElementById('vStatus').textContent = r.dynamic_status;

    // Handle dynamic rows for view modal
    const deptRow = document.getElementById('vDeptProgRow');
    const empRow = document.getElementById('vEmpDetailsRow');
    if (currentTab === 'student') {
        deptRow.style.display = 'block'; 
        empRow.style.display = 'none';
        document.getElementById('vDeptProg').textContent = `${r.department || 'N/A'} - ${r.program || 'N/A'}`;
    } else if (currentTab === 'employee') {
        deptRow.style.display = 'none'; 
        empRow.style.display = 'block';
        document.getElementById('vEmpDetails').textContent = `${r.department || 'N/A'} / ${r.position || 'N/A'} / ${r.employment_status || 'N/A'}`;
    } else {
        deptRow.style.display = 'none'; 
        empRow.style.display = 'none';
    }

    openModal('viewModal');
}

function openEditModal(visitId) {
    const r = currentData.find(d => d.visit_id === visitId);
    editingVisitId = visitId;

    document.getElementById('editTitleName').textContent = r.name;
    document.getElementById('eId').value = r.srcode || r.employee_id || r.idNo;
    document.getElementById('eDate').value = new Date(r.visit_date).toLocaleDateString();
    document.getElementById('eTimeIn').value = r.time_in;
    document.getElementById('eTimeOut').value = r.time_out || 'N/A';
    document.getElementById('eName').value = r.name;
    document.getElementById('eAge').value = r.age || 'N/A';
    document.getElementById('eGender').value = r.gender || 'N/A';

    // Show specific fields based on tab in Edit Modal
    const studentFields = document.getElementById('eStudentFields');
    if (currentTab === 'student') {
        studentFields.style.display = 'grid';
        document.getElementById('eDept').value = r.department || 'N/A';
        document.getElementById('eProg').value = r.program || 'N/A';
    } else {
        studentFields.style.display = 'none';
    }

    // Editable Fields
    document.getElementById('eBP').value = r.blood_pressure || '';
    document.getElementById('eCertStatus').value = r.cert_status || 'Completed';
    document.getElementById('eRemarks').value = r.remarks || '';

    openModal('editModal');
}

async function saveEdit() {
    const data = {
        blood_pressure: document.getElementById('eBP').value,
        cert_status: document.getElementById('eCertStatus').value,
        remarks: document.getElementById('eRemarks').value
    };
    
    try {
        const res = await fetch(`/api/clients/${currentTab}/${editingVisitId}`, {
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(data)
        });
        
        if (res.ok) { 
            closeModal('editModal'); 
            loadData(); 
        } else {
            alert("Error saving record.");
        }
    } catch (error) {
        console.error("Error saving edit:", error);
    }
}

function downloadExcel() { 
    window.location.href = `/api/export/${currentTab}`; 
}

// Load default data on page start
document.addEventListener('DOMContentLoaded', loadData);