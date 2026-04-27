let inventoryData = [];

document.addEventListener('DOMContentLoaded', loadInventory);

// Attach event listeners for real-time filtering
document.getElementById('searchInv').addEventListener('input', applyFilters);
document.getElementById('statusFilter').addEventListener('change', applyFilters);

async function loadInventory() {
    try {
        const res = await fetch('/api/inventory');
        const data = await res.json();
        
        // Calculate dynamic status for each item
        inventoryData = data.map(item => ({
            ...item,
            derived_status: calculateStatus(item.quantity, item.expiration_date)
        }));
        
        applyFilters();
    } catch (err) {
        console.error("Error loading inventory:", err);
        document.getElementById('inventoryTableBody').innerHTML = `<tr><td colspan="8" style="text-align:center; color:red;">Failed to load inventory.</td></tr>`;
    }
}

function calculateStatus(qty, expDate) {
    if (expDate) {
        const today = new Date();
        const exp = new Date(expDate);
        if (exp < today) return 'Expired';
    }
    // Assuming 2 boxes or fewer is "Low Stock". Adjust as needed!
    if (qty <= 2) return 'Low Stock';
    return 'Good';
}

function applyFilters() {
    const search = document.getElementById('searchInv').value.toLowerCase().trim();
    const status = document.getElementById('statusFilter').value;

    const filtered = inventoryData.filter(item => {
        const genName = (item.generic_name || '').toLowerCase();
        const brName = (item.brand_name || '').toLowerCase();
        const matchSearch = genName.includes(search) || brName.includes(search);
        
        const matchStatus = status === 'All' || item.derived_status === status;
        
        return matchSearch && matchStatus;
    });

    renderTable(filtered);
    updateSummary(inventoryData); 
}

function renderTable(data) {
    const tbody = document.getElementById('inventoryTableBody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No medicines found.</td></tr>`;
        return;
    }

    data.forEach((item, index) => {
        let badgeClass = '';
        if (item.derived_status === 'Good') badgeClass = 'status-good';
        else if (item.derived_status === 'Low Stock') badgeClass = 'status-low';
        else badgeClass = 'status-expired';

        const expDisplay = item.expiration_date ? new Date(item.expiration_date).toLocaleDateString() : 'N/A';

        tbody.innerHTML += `
            <tr>
                <td style="font-weight:bold;">${index + 1}</td>
                <td style="font-weight:700; color:#333;">${item.generic_name || ''}</td>
                <td style="font-weight:700; color:#333;">${item.brand_name || ''}</td>
                <td>${item.quantity || 0}</td>
                <td>${item.pieces || 0}</td>
                <td><span class="status-badge ${badgeClass}">${item.derived_status}</span></td>
                <td style="font-weight:600; color:#555;">${expDisplay}</td>
                <td>
                    <img src="/images/edit-icon.png" alt="Edit" class="action-icon" onclick="openEditModal(${item.med_id})">
                </td>
            </tr>
        `;
    });
}

function updateSummary(data) {
    const total = data.length;
    const low = data.filter(i => i.derived_status === 'Low Stock').length;
    const expired = data.filter(i => i.derived_status === 'Expired').length;

    document.getElementById('countTotal').textContent = total;
    document.getElementById('countLow').textContent = low;
    document.getElementById('countExpired').textContent = expired;
}

async function addMedicine() {
    const data = {
        generic_name: document.getElementById('addGeneric').value.trim(),
        brand_name: document.getElementById('addBrand').value.trim(),
        quantity: document.getElementById('addQty').value || 0,
        pieces: document.getElementById('addPcs').value || 0,
        expiration_date: document.getElementById('addExp').value || null
    };

    if (!data.generic_name && !data.brand_name) return alert("Please provide a Generic or Brand name.");

    try {
        const res = await fetch('/api/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            document.querySelectorAll('.add-medicine-panel input').forEach(el => el.value = '');
            loadInventory();
        } else {
            alert("Failed to add medicine.");
        }
    } catch (err) {
        console.error(err);
    }
}

function openEditModal(id) {
    // CHANGED TO med_id
    const item = inventoryData.find(i => i.med_id === id);
    if (!item) return;

    document.getElementById('editId').value = item.med_id;
    document.getElementById('editGeneric').value = item.generic_name || '';
    document.getElementById('editBrand').value = item.brand_name || '';
    document.getElementById('editQty').value = item.quantity || 0;
    document.getElementById('editPcs').value = item.pieces || 0;
    
    if (item.expiration_date) {
        document.getElementById('editExp').value = new Date(item.expiration_date).toISOString().split('T')[0];
    } else {
        document.getElementById('editExp').value = '';
    }

    document.getElementById('editInvModal').style.display = 'flex';
}

async function saveEditMedicine() {
    const id = document.getElementById('editId').value;
    const data = {
        generic_name: document.getElementById('editGeneric').value.trim(),
        brand_name: document.getElementById('editBrand').value.trim(),
        quantity: document.getElementById('editQty').value || 0,
        pieces: document.getElementById('editPcs').value || 0,
        expiration_date: document.getElementById('editExp').value || null
    };

    try {
        const res = await fetch(`/api/inventory/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            closeModal('editInvModal');
            loadInventory();
        } else {
            alert("Failed to update medicine.");
        }
    } catch (err) {
        console.error(err);
    }
}

function downloadInventory() {
    window.location.href = '/api/export-inventory';
}

function closeModal(id) { document.getElementById(id).style.display = 'none'; }
window.onclick = function(e) { if (e.target.classList.contains('modal')) e.target.style.display = 'none'; }