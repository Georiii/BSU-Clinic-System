let currentTab = 'student';
let currentData = [];
let editingVisitId = null;
let viewingRecord = null;

// Switch Tab Logic and Dynamic Filters
async function switchTab(tab, btnElement) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');
    document.getElementById('filterDept').style.display = (tab === 'student') ? 'block' : 'none';
    document.getElementById('filterEmpDetails').style.display = (tab === 'employee') ? 'flex' : 'none';

    // Clear search and date range when switching tabs
    document.getElementById('searchInput').value = '';
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';

    await loadData();
}

async function loadData() {
    try {
        const res = await fetch(`/api/clients/${currentTab}`);
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const json = await res.json();
        currentData = Array.isArray(json) ? json : [];
        applyFiltersAndRender();
    } catch (error) {
        console.error("Error loading data:", error);
        currentData = [];
        renderTable([]);
    }
}

function renderTable(data) {
    const tbody = document.getElementById('clientTableBody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px;">No records found.</td></tr>`;
        return;
    }

    data.forEach((row, index) => {
        let idVal = row.srcode || row.employee_id || row.idNo;
        let pillClass = row.dynamic_status === 'Completed' ? 'completed' : row.dynamic_status === 'In-Clinic' ? 'in-clinic' : 'on-hold';

        let purposes = [];
        if (currentTab === 'student') {
            if (row.purpose_medical_consult) purposes.push('Medical Consult/Medicine');
            if (row.purpose_dental) purposes.push('Dental');
            if (row.purpose_blood_pressure) purposes.push('Blood Pressure');
            if (row.purpose_med_cert) purposes.push('Medical Certificate');
            if (row.purpose_pre_enrolment) purposes.push('Pre-enrolment');
            if (row.purpose_others) purposes.push('Others');
        } else if (currentTab === 'employee') {
            if (row.purpose_of_visit) purposes.push(row.purpose_of_visit);
        } else {
            if (row.purpose) purposes.push(row.purpose);
        }
        let purposeText = purposes.length > 0 ? purposes.join(', ') : 'Various';

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
                    <img src="/images/print-icon.png" alt="Print" class="action-icon" onclick="window.location.href='/api/export-single/${currentTab}/${row.visit_id}'">
                </td>
            </tr>
        `;
    });
}

// ════════════════════════════════════════════════════════════
//  SEARCH, DATE RANGE, AND MODAL FILTER LOGIC
// ════════════════════════════════════════════════════════════

function applyFiltersAndRender() {
    let filteredData = [...currentData];

    // 1. Search Bar Filter (ID or Name)
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    if (searchTerm) {
        filteredData = filteredData.filter(row => {
            const name = (row.name || '').toLowerCase();
            const id = (row.srcode || row.employee_id || row.idNo || '').toLowerCase();
            return name.includes(searchTerm) || id.includes(searchTerm);
        });
    }

    // 2. Date Range Filter (From → To)
    const dateFrom = document.getElementById('dateFrom').value; // YYYY-MM-DD
    const dateTo   = document.getElementById('dateTo').value;   // YYYY-MM-DD

    if (dateFrom || dateTo) {
        filteredData = filteredData.filter(row => {
            if (!row.visit_date) return false;
            const dbDate = new Date(row.visit_date).toISOString().split('T')[0];
            if (dateFrom && dateTo) return dbDate >= dateFrom && dbDate <= dateTo;
            if (dateFrom) return dbDate >= dateFrom;
            if (dateTo)   return dbDate <= dateTo;
            return true;
        });
    }

    // 3. Modal Checkbox Filters
    const getCheckedValues = (selector) => {
        return Array.from(document.querySelectorAll(selector))
                    .filter(cb => cb.checked)
                    .map(cb => cb.value || cb.nextSibling.textContent.trim());
    };

    const activeGenders  = getCheckedValues('.filter-grid div:nth-child(1) input[type="checkbox"]');
    const activePurposes = getCheckedValues('.filter-grid div:nth-child(3) input[type="checkbox"]');
    const activeStatuses = getCheckedValues('.filter-grid div:nth-child(4) input[type="checkbox"]:not([value="PWD"]):not([value="None"]):not([value="Others"])');

    if (activeStatuses.length > 0) {
        filteredData = filteredData.filter(row => activeStatuses.includes(row.dynamic_status));
    }

    if (activeGenders.length > 0) {
        filteredData = filteredData.filter(row => activeGenders.includes(row.gender));
    }

    if (activePurposes.length > 0) {
        filteredData = filteredData.filter(row => {
            let rowPurposes = "";
            if (currentTab === 'student') {
                rowPurposes = [
                    row.purpose_medical_consult ? 'Medical Consult/Medicine' : '',
                    row.purpose_dental ? 'Dental' : '',
                    row.purpose_blood_pressure ? 'Blood Pressure' : '',
                    row.purpose_med_cert ? 'Medical Certificate' : '',
                    row.purpose_others ? 'Others' : ''
                ].join(' ');
            } else if (currentTab === 'employee') {
                rowPurposes = row.purpose_of_visit || "";
            } else {
                rowPurposes = row.purpose || "";
            }
            return activePurposes.some(p => rowPurposes.includes(p));
        });
    }

    // 4. Sorting (A-Z / Z-A)
    const sortAsc  = document.querySelector('input[name="sort"][value="asc"]')?.checked;
    const sortDesc = document.querySelector('input[name="sort"][value="desc"]')?.checked;

    if (sortAsc)  filteredData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    if (sortDesc) filteredData.sort((a, b) => (b.name || '').localeCompare(a.name || ''));

    renderTable(filteredData);
}

// Attach event listeners
document.getElementById('searchInput').addEventListener('input', applyFiltersAndRender);
document.getElementById('dateFrom').addEventListener('change', applyFiltersAndRender);
document.getElementById('dateTo').addEventListener('change', applyFiltersAndRender);

document.getElementById('applyFilterBtn').addEventListener('click', () => {
    applyFiltersAndRender();
    closeModal('filterModal');
});

document.getElementById('cancelFilterBtn').addEventListener('click', () => {
    document.querySelectorAll('.filter-grid input[type="checkbox"], .filter-grid input[type="radio"]').forEach(el => el.checked = false);
    applyFiltersAndRender();
    closeModal('filterModal');
});

// ════════════════════════════════════════════════════════════

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

window.onclick = function(e) {
    if (e.target.classList.contains('modal')) e.target.style.display = 'none';
}

function toggleDisability(value) {
    document.getElementById('disabilityRow').style.display = (value === 'PWD') ? 'flex' : 'none';
}

function toggleSubOptions(containerId, show) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.style.display = show ? 'flex' : 'none';
    if (!show) {
        el.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        el.querySelectorAll('input[type="text"]').forEach(t => t.value = '');
    }
}

function loadSignature(imgId, placeholderId, sigData) {
    const img = document.getElementById(imgId);
    const placeholder = document.getElementById(placeholderId);
    if (sigData) {
        img.src = sigData;
        img.style.display = 'block';
        placeholder.style.display = 'none';
    } else {
        img.src = '';
        img.style.display = 'none';
        placeholder.style.display = 'block';
    }
}

function openViewModal(visitId) {
    const r = currentData.find(d => d.visit_id === visitId);
    viewingRecord = r;

    document.getElementById('vName').textContent = r.name;
    document.getElementById('vId').textContent = r.srcode || r.employee_id || r.idNo;
    document.getElementById('vDate').textContent = new Date(r.visit_date).toLocaleDateString();
    document.getElementById('vTimeIn').textContent = r.time_in;
    document.getElementById('vTimeOut').textContent = r.time_out || 'N/A';
    document.getElementById('vAge').textContent = r.age || 'N/A';
    document.getElementById('vGender').textContent = r.gender || 'N/A';
    document.getElementById('vSpecial').textContent = r.special_needs || 'None';
    document.getElementById('vConfined').textContent = r.is_confined || 'No';
    document.getElementById('vStatus').textContent = r.dynamic_status;

    let purposes = [];
    if (currentTab === 'student') {
        if (r.purpose_medical_consult) purposes.push('Medical Consult/Medicine');
        if (r.purpose_dental) purposes.push(r.dental_service_type ? `Dental (${r.dental_service_type})` : 'Dental');
        if (r.purpose_blood_pressure) purposes.push('Blood Pressure');
        if (r.purpose_med_cert) purposes.push(r.cert_type ? `Medical Certificate (${r.cert_type})` : 'Medical Certificate');
        if (r.purpose_pre_enrolment) purposes.push('Pre-enrolment');
        if (r.purpose_others) purposes.push(`Others: ${r.purpose_others}`);
    } else if (currentTab === 'employee') {
        if (r.purpose_of_visit) purposes.push(r.purpose_of_visit);
        if (r.dental_service_type) purposes.push(`Dental type: ${r.dental_service_type}`);
        if (r.certificate_type) purposes.push(`Cert type: ${r.certificate_type}`);
        if (r.others_specify) purposes.push(`Others: ${r.others_specify}`);
    } else {
        if (r.purpose) purposes.push(r.purpose);
    }
    document.getElementById('vPurpose').textContent = purposes.length > 0 ? purposes.join(' | ') : 'N/A';

    const deptRow = document.getElementById('vDeptProgRow');
    const empRow  = document.getElementById('vEmpDetailsRow');
    if (currentTab === 'student') {
        deptRow.style.display = 'block'; empRow.style.display = 'none';
        document.getElementById('vDeptProg').textContent = `${r.department || 'N/A'} - ${r.program || 'N/A'}`;
    } else if (currentTab === 'employee') {
        deptRow.style.display = 'none'; empRow.style.display = 'block';
        document.getElementById('vEmpDetails').textContent = `${r.department || 'N/A'} / ${r.position || 'N/A'} / ${r.employment_status || 'N/A'}`;
    } else {
        deptRow.style.display = 'none'; empRow.style.display = 'none';
    }

    loadSignature('vSignature', 'vSigPlaceholder', r.signature);
    openModal('viewModal');
}

async function downloadVisitRecord() {
    if (!viewingRecord) return;
    window.location.href = `/api/export-single/${currentTab}/${viewingRecord.visit_id}`;
}

function openEditModal(visitId) {
    const r = currentData.find(d => d.visit_id === visitId);
    editingVisitId = visitId;

    document.getElementById('editTitleName').textContent = r.name;
    document.getElementById('eId').value     = r.srcode || r.employee_id || r.idNo;
    document.getElementById('eDate').value   = new Date(r.visit_date).toLocaleDateString();
    document.getElementById('eTimeIn').value = r.time_in;
    document.getElementById('eTimeOut').value = r.time_out || 'N/A';
    document.getElementById('eName').value   = r.name;
    document.getElementById('eAge').value    = r.age || 'N/A';
    document.getElementById('eGender').value = r.gender || 'N/A';

    const studentFields = document.getElementById('eStudentFields');
    if (currentTab === 'student') {
        studentFields.style.display = 'grid';
        document.getElementById('eDept').value = r.department || 'N/A';
        document.getElementById('eProg').value = r.program || 'N/A';
    } else {
        studentFields.style.display = 'none';
    }

    document.getElementById('eBP').value         = r.blood_pressure || '';
    document.getElementById('eCertStatus').value  = r.cert_status || 'Completed';
    document.getElementById('eRemarks').value     = r.remarks || '';

    const specialVal = r.special_needs || 'None';
    document.getElementById('eSpecial').value    = specialVal;
    toggleDisability(specialVal);
    document.getElementById('eDisability').value = r.pwd_type || 'N/A';

    ['pMedConsult','pBloodPressure','pDental','pMedCert','pPreEnrol','pOthers'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.checked = false;
    });
    document.querySelectorAll('[name="dentalType"], [name="medCertType"]').forEach(cb => cb.checked = false);
    toggleSubOptions('dentalSub', false);
    toggleSubOptions('medCertSub', false);
    toggleSubOptions('othersSub', false);

    if (currentTab === 'student') {
        if (r.purpose_medical_consult) document.getElementById('pMedConsult').checked = true;
        if (r.purpose_blood_pressure)  document.getElementById('pBloodPressure').checked = true;
        if (r.purpose_pre_enrolment)   document.getElementById('pPreEnrol').checked = true;
        if (r.purpose_dental) {
            document.getElementById('pDental').checked = true;
            toggleSubOptions('dentalSub', true);
            if (r.dental_service_type) {
                document.querySelectorAll('[name="dentalType"]').forEach(cb => {
                    if (r.dental_service_type.includes(cb.value)) cb.checked = true;
                });
            }
        }
        if (r.purpose_med_cert) {
            document.getElementById('pMedCert').checked = true;
            toggleSubOptions('medCertSub', true);
            if (r.cert_type) {
                document.querySelectorAll('[name="medCertType"]').forEach(cb => {
                    if (r.cert_type.includes(cb.value)) cb.checked = true;
                });
            }
        }
        if (r.purpose_others) {
            document.getElementById('pOthers').checked = true;
            toggleSubOptions('othersSub', true);
            const othersInput = document.querySelector('#othersSub input[type="text"]');
            if (othersInput) othersInput.value = r.purpose_others;
        }
    } else if (currentTab === 'employee') {
        const pov = r.purpose_of_visit || '';
        if (pov.includes('Medical Consult') || pov.includes('Medicine')) document.getElementById('pMedConsult').checked = true;
        if (pov.includes('Blood Pressure'))  document.getElementById('pBloodPressure').checked = true;
        if (pov.includes('Pre-enrolment'))   document.getElementById('pPreEnrol').checked = true;
        if (pov.includes('Dental')) {
            document.getElementById('pDental').checked = true;
            toggleSubOptions('dentalSub', true);
            if (r.dental_service_type) {
                document.querySelectorAll('[name="dentalType"]').forEach(cb => {
                    if (r.dental_service_type.includes(cb.value)) cb.checked = true;
                });
            }
        }
        if (pov.includes('Medical Certificate') || pov.includes('Certificate')) {
            document.getElementById('pMedCert').checked = true;
            toggleSubOptions('medCertSub', true);
            if (r.certificate_type) {
                document.querySelectorAll('[name="medCertType"]').forEach(cb => {
                    if (r.certificate_type.includes(cb.value)) cb.checked = true;
                });
            }
        }
        if (r.others_specify) {
            document.getElementById('pOthers').checked = true;
            toggleSubOptions('othersSub', true);
            const othersInput = document.querySelector('#othersSub input[type="text"]');
            if (othersInput) othersInput.value = r.others_specify;
        }
    } else {
        if (r.purpose) {
            document.getElementById('pOthers').checked = true;
            toggleSubOptions('othersSub', true);
            const othersInput = document.querySelector('#othersSub input[type="text"]');
            if (othersInput) othersInput.value = r.purpose;
        }
    }

    loadSignature('eSignature', 'eSigPlaceholder', r.signature);
    openModal('editModal');
}

async function saveEdit() {
    const dentalChecked  = document.getElementById('pDental').checked;
    const medCertChecked = document.getElementById('pMedCert').checked;
    const othersChecked  = document.getElementById('pOthers').checked;

    const dentalTypes = dentalChecked
        ? [...document.querySelectorAll('[name="dentalType"]:checked')].map(cb => cb.value).join(', ')
        : '';
    const medCertTypes = medCertChecked
        ? [...document.querySelectorAll('[name="medCertType"]:checked')].map(cb => cb.value).join(', ')
        : '';
    const othersText = othersChecked
        ? (document.querySelector('#othersSub input[type="text"]')?.value || '')
        : '';

    const specialVal = document.getElementById('eSpecial').value;

    const data = {
        blood_pressure:          document.getElementById('eBP').value,
        cert_status:             document.getElementById('eCertStatus').value,
        remarks:                 document.getElementById('eRemarks').value,
        special_needs:           specialVal,
        pwd_type:                specialVal === 'PWD' ? document.getElementById('eDisability').value : 'N/A',
        purpose_medical_consult: document.getElementById('pMedConsult').checked ? 1 : 0,
        purpose_blood_pressure:  document.getElementById('pBloodPressure').checked ? 1 : 0,
        purpose_dental:          dentalChecked ? 1 : 0,
        purpose_med_cert:        medCertChecked ? 1 : 0,
        purpose_pre_enrolment:   document.getElementById('pPreEnrol').checked ? 1 : 0,
        dental_service_type:     dentalTypes,
        cert_type:               medCertTypes,
        certificate_type:        medCertTypes,
        purpose_others:          othersText,
        others_specify:          othersText,
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

document.addEventListener('DOMContentLoaded', loadData);