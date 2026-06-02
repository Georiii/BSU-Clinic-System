// Report.js
let allReportData = [];
let activeFilters = {};
let genderChartInst = null;
let clientChartInst = null;
let purposeChartInst = null;

const CHART_COLORS = ['#50C878','#FFCC00','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316'];

document.addEventListener('DOMContentLoaded', () => {
    // Default to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('reportFrom').value = today;
    document.getElementById('reportTo').value   = today;
    loadReports();
});

async function loadReports() {
    try {
        const from = document.getElementById('reportFrom').value;
        const to   = document.getElementById('reportTo').value;

        // Fetch all three types
        const [sRes, eRes, vRes] = await Promise.all([
            fetch('/api/clients/student'),
            fetch('/api/clients/employee'),
            fetch('/api/clients/visitor')
        ]);

        const students  = await sRes.json();
        const employees = await eRes.json();
        const visitors  = await vRes.json();

        // Tag each with type
        const tagged = [
            ...students.map(r  => ({ ...r, clientType: 'Student'  })),
            ...employees.map(r => ({ ...r, clientType: 'Employee' })),
            ...visitors.map(r  => ({ ...r, clientType: 'Visitor'  }))
        ];

        // Date filter — extract date portion using LOCAL time to avoid UTC shift
        allReportData = tagged.filter(r => {
            if (!r.visit_date) return false;
            
            // Convert to a proper Date object first
            const dateObj = new Date(r.visit_date);
            
            // Format using LOCAL time (not UTC) to avoid timezone rollback
            const year  = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day   = String(dateObj.getDate()).padStart(2, '0');
            const d     = `${year}-${month}-${day}`;
            
            if (from && d < from) return false;
            if (to   && d > to)   return false;
            return true;
        });

        renderAll(applyActiveFilters(allReportData));
    } catch (err) {
        console.error("Report load error:", err);
    }
}

function applyActiveFilters(data) {
    let filtered = [...data];

    const genders = [...document.querySelectorAll('.f-gender:checked')].map(c => c.value);
    if (genders.length) filtered = filtered.filter(r => genders.includes(r.gender));

    const purposes = [...document.querySelectorAll('.f-purpose:checked')].map(c => c.value);
    if (purposes.length) {
        filtered = filtered.filter(r => {
            const rp = [
                r.purpose_medical_consult ? 'Medical Consult/Medicine' : '',
                r.purpose_dental          ? 'Dental' : '',
                r.purpose_med_cert        ? 'Medical Certificate' : '',
                r.purpose_blood_pressure  ? 'Blood Pressure' : '',
                r.purpose_others          ? 'Others' : '',
                r.purpose_of_visit        || '',
                r.purpose                 || ''
            ].join(' ');
            return purposes.some(p => rp.includes(p));
        });
    }

    const statuses = [...document.querySelectorAll('.f-status:checked')].map(c => c.value);
    if (statuses.length) filtered = filtered.filter(r => statuses.includes(r.dynamic_status));

    const specials = [...document.querySelectorAll('.f-special:checked')].map(c => c.value);
    if (specials.length) filtered = filtered.filter(r => specials.includes(r.special_needs || 'None'));

    const empTypes = [...document.querySelectorAll('.f-emptype:checked')].map(c => c.value);
    if (empTypes.length) filtered = filtered.filter(r => empTypes.includes(r.employment_type));

    const empStatuses = [...document.querySelectorAll('.f-empstatus:checked')].map(c => c.value);
    if (empStatuses.length) filtered = filtered.filter(r => empStatuses.includes(r.employment_status));

    const depts = [...document.querySelectorAll('.f-dept:checked')].map(c => c.value);
    if (depts.length) filtered = filtered.filter(r => depts.includes(r.department));

    if (document.getElementById('f-medicine')?.checked) {
        filtered = filtered.filter(r => r.medicines && r.medicines.length > 0);
    }

    // Sort
    const sort = document.querySelector('input[name="fsort"]:checked')?.value;
    if (sort === 'asc')  filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    if (sort === 'desc') filtered.sort((a, b) => (b.name || '').localeCompare(a.name || ''));

    return filtered;
}

function renderAll(data) {
    renderCards(data);
    renderGenderChart(data);
    renderClientChart(data);
    renderPurposeChart(data);
    renderMedicineChart(data);
    renderTextSummary(data);
}

function renderMedicineChart(data) {
    const counts = {};
    data.forEach(r => {
        if (r.medicines && r.medicines.length > 0) {
            r.medicines.forEach(m => {
                const name = m.medicine_generic || m.medicine_brand || 'Unknown';
                counts[name] = (counts[name] || 0) + (parseInt(m.quantity_box) || 1);
            });
        }
    });

    if (Object.keys(counts).length === 0) {
        const existing = Chart.getChart('medicineChart');
        if (existing) existing.destroy();
        document.getElementById('medicineLegend').innerHTML = '<span style="color:#aaa; font-size:12px;">No medicines dispensed in this period.</span>';
        return;
    }

    buildPieChart('medicineChart', 'medicineLegend', counts);
}

function renderCards(data) {
    const today = new Date().toISOString().split('T')[0];
    const active   = data.filter(r => !r.time_out);
    const success  = data.filter(r => r.time_out);
    const confined = data.filter(r => r.is_confined === 'Yes');

    document.getElementById('activeCount').textContent   = active.length;
    document.getElementById('successCount').textContent  = success.length;
    document.getElementById('totalCount').textContent    = data.length;
    document.getElementById('confinedCount').textContent = confined.length;
}

function renderGenderChart(data) {
    const counts = {};
    data.forEach(r => {
        const g = r.gender || 'Unknown';
        counts[g] = (counts[g] || 0) + 1;
    });
    buildPieChart('genderChart', 'genderLegend', counts);
}

function renderClientChart(data) {
    const counts = { Student: 0, Employee: 0, Visitor: 0 };
    data.forEach(r => { counts[r.clientType] = (counts[r.clientType] || 0) + 1; });
    buildPieChart('clientChart', 'clientLegend', counts);
}

function renderPurposeChart(data) {
    const counts = {};
    data.forEach(r => {
        if (r.purpose_medical_consult) counts['Medical Consult']    = (counts['Medical Consult']    || 0) + 1;
        if (r.purpose_dental)          counts['Dental']             = (counts['Dental']             || 0) + 1;
        if (r.purpose_blood_pressure)  counts['Blood Pressure']     = (counts['Blood Pressure']     || 0) + 1;
        if (r.purpose_med_cert)        counts['Medical Certificate'] = (counts['Medical Certificate']|| 0) + 1;
        if (r.purpose_pre_enrolment)   counts['Pre-enrolment']      = (counts['Pre-enrolment']      || 0) + 1;
        if (r.purpose_others)          counts['Others']             = (counts['Others']             || 0) + 1;
        if (r.purpose_of_visit) {
            r.purpose_of_visit.split(',').forEach(p => {
                const key = p.trim();
                if (key) counts[key] = (counts[key] || 0) + 1;
            });
        }
        if (r.purpose && r.clientType === 'Visitor') {
            counts[r.purpose] = (counts[r.purpose] || 0) + 1;
        }
    });
    buildPieChart('purposeChart', 'purposeLegend', counts);
}

function buildPieChart(canvasId, legendId, counts) {
    const labels = Object.keys(counts);
    const values = Object.values(counts);
    const total  = values.reduce((a, b) => a + b, 0);
    const colors = CHART_COLORS.slice(0, labels.length);

    // Destroy existing
    const existing = Chart.getChart(canvasId);
    if (existing) existing.destroy();

    const ctx = document.getElementById(canvasId).getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const pct = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : 0;
                            return ` ${ctx.label}: ${ctx.raw} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });

    // Custom legend
    const legendEl = document.getElementById(legendId);
    legendEl.innerHTML = labels.map((l, i) => {
        const pct = total > 0 ? ((values[i] / total) * 100).toFixed(1) : 0;
        return `<div class="legend-item">
            <div class="legend-dot" style="background:${colors[i]};"></div>
            <span>${l} <strong>${pct}%</strong></span>
        </div>`;
    }).join('');
}

function renderTextSummary(data) {
    const el = document.getElementById('textSummary');
    if (data.length === 0) {
        el.innerHTML = '<p style="color:#aaa; grid-column:1/3;">No data found for the selected period and filters.</p>';
        return;
    }

    const total    = data.length;
    const active   = data.filter(r => !r.time_out).length;
    const success  = data.filter(r => r.time_out).length;
    const confined = data.filter(r => r.is_confined === 'Yes').length;
    const students  = data.filter(r => r.clientType === 'Student').length;
    const employees = data.filter(r => r.clientType === 'Employee').length;
    const visitors  = data.filter(r => r.clientType === 'Visitor').length;

    // Gender breakdown
    const gMap = {};
    data.forEach(r => { const g = r.gender || 'Unknown'; gMap[g] = (gMap[g] || 0) + 1; });
    const gText = Object.entries(gMap).map(([k, v]) => `${k}: ${v}`).join(', ');

    // Purpose breakdown
    const pMap = {};
    data.forEach(r => {
        if (r.purpose_medical_consult) pMap['Medical Consult']    = (pMap['Medical Consult']    || 0) + 1;
        if (r.purpose_dental)          pMap['Dental']             = (pMap['Dental']             || 0) + 1;
        if (r.purpose_blood_pressure)  pMap['Blood Pressure']     = (pMap['Blood Pressure']     || 0) + 1;
        if (r.purpose_med_cert)        pMap['Medical Certificate'] = (pMap['Medical Certificate']|| 0) + 1;
        if (r.purpose_pre_enrolment)   pMap['Pre-enrolment']      = (pMap['Pre-enrolment']      || 0) + 1;
        if (r.purpose_of_visit) r.purpose_of_visit.split(',').forEach(p => { const k = p.trim(); if (k) pMap[k] = (pMap[k] || 0) + 1; });
        if (r.purpose && r.clientType === 'Visitor') pMap[r.purpose] = (pMap[r.purpose] || 0) + 1;
    });
    const pText = Object.entries(pMap).sort((a,b) => b[1]-a[1]).map(([k,v]) => `${k}: ${v}`).join(', ');

    // Dept breakdown
    const dMap = {};
    data.forEach(r => { if (r.department) dMap[r.department] = (dMap[r.department] || 0) + 1; });
    const dText = Object.entries(dMap).sort((a,b) => b[1]-a[1]).map(([k,v]) => `${k}: ${v}`).join(', ') || 'N/A';

    // Medicine count
    const medCount = data.filter(r => r.medicines && r.medicines.length > 0).length;

    const from = document.getElementById('reportFrom').value || 'All time';
    const to   = document.getElementById('reportTo').value   || 'All time';

    el.innerHTML = `
        <div class="summary-section">
            <h4>Overview</h4>
            <p>📅 <strong>Period:</strong> ${from} → ${to}</p>
            <p>📋 <strong>Total Visits:</strong> ${total}</p>
            <p>🏥 <strong>Active In-Clinic:</strong> ${active}</p>
            <p>✅ <strong>Timed Out (Completed):</strong> ${success}</p>
            <p>🛏 <strong>Confined Cases:</strong> ${confined}</p>
            <p>💊 <strong>Visits with Medicine Dispensed:</strong> ${medCount}</p>
        </div>
        <div class="summary-section">
            <h4>Client Breakdown</h4>
            <p>🎓 <strong>Students:</strong> ${students}</p>
            <p>👔 <strong>Employees:</strong> ${employees}</p>
            <p>👤 <strong>Visitors:</strong> ${visitors}</p>
            <p>♀♂ <strong>Gender:</strong> ${gText || 'N/A'}</p>
        </div>
        <div class="summary-section">
            <h4>Purpose of Visit</h4>
            <p>${pText || 'N/A'}</p>
        </div>
        <div class="summary-section">
            <h4>Department Distribution</h4>
            <p>${dText}</p>
        </div>
    `;
}

function applyFilters() {
    renderAll(applyActiveFilters(allReportData));
    closeModal('filterModal');
}

function clearFilters() {
    document.querySelectorAll('.filter-grid input[type="checkbox"], .filter-grid input[type="radio"]')
        .forEach(el => el.checked = false);
    renderAll(applyActiveFilters(allReportData));
    closeModal('filterModal');
}

function clearDates() {
    document.getElementById('reportFrom').value = '';
    document.getElementById('reportTo').value   = '';
    loadReports();
}

async function downloadReport() {
    const from = document.getElementById('reportFrom').value || 'all';
    const to   = document.getElementById('reportTo').value   || 'all';
    window.location.href = `/api/export-report?from=${from}&to=${to}`;
}

function openModal(id)  { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
window.onclick = function(e) { if (e.target.classList.contains('modal')) e.target.style.display = 'none'; }

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const menuItems = document.querySelectorAll('.sidebar-menu li');

    sidebar.classList.toggle('collapsed');

    menuItems.forEach((item, index) => {
        item.style.transitionDelay = `${index * 0.05}s`;
        if (sidebar.classList.contains('collapsed')) {
            item.classList.add('tilt-out');
        } else {
            item.classList.remove('tilt-out');
        }
    });

    if (sidebar.classList.contains('collapsed')) {
        mainContent.style.width = 'calc(100vw - 80px)';
        mainContent.style.maxWidth = 'calc(100vw - 80px)';
    } else {
        mainContent.style.width = 'calc(100vw - 260px)';
        mainContent.style.maxWidth = 'calc(100vw - 260px)';
    }
}