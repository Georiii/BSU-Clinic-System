let currentAdminProfile = {};
let isLoggingOut = false;
let timeoutInterval;
let needsTimeout = false; 
const activeAdminUsername = sessionStorage.getItem('loggedInAdminUsername') || 'Mark_G';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch(`/api/admin/profile?username=${encodeURIComponent(activeAdminUsername)}`); 
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        
        const data = await res.json();
        
        currentAdminProfile = data?.profile || {};
        const logs = data?.logs || [];

        // 1. Populate Profile UI
        document.getElementById('adminName').innerHTML = `${currentAdminProfile.fullname || 'Unknown Admin'} `;
        document.getElementById('adminId').textContent = currentAdminProfile.id_number || 'N/A';
        document.getElementById('adminPosition').textContent = currentAdminProfile.position || 'N/A';
        document.getElementById('adminDept').textContent = currentAdminProfile.department || 'N/A';
        document.getElementById('adminStatus').textContent = currentAdminProfile.employment_status || 'N/A';
        document.getElementById('adminType').textContent = currentAdminProfile.employment_type || 'N/A';

        // Initialize Avatar
        if (currentAdminProfile.avatar) {
            document.getElementById('adminAvatarImg').src = currentAdminProfile.avatar;
            document.getElementById('adminAvatarImg').style.display = 'block';
            document.getElementById('adminAvatarFallback').style.display = 'none';
        }

        // 2. Populate Log Table
        renderLogTable(logs);

        // 3. Setup Signature Pad
        const canvas = document.getElementById('signatureCanvas');
        const signaturePad = new SignaturePad(canvas);

        function resizeCanvas() {
            const ratio =  Math.max(window.devicePixelRatio || 1, 1);
            canvas.width = canvas.offsetWidth * ratio;
            canvas.height = canvas.offsetHeight * ratio;
            canvas.getContext("2d").scale(ratio, ratio);
            
            // Just clear the pad to ensure it scales correctly, DO NOT auto-load DB signature
            signaturePad.clear(); 
        }
        
        window.addEventListener("resize", resizeCanvas);
        resizeCanvas();

        // 4. Signature Buttons
        document.getElementById('clearSignatureBtn').addEventListener('click', () => signaturePad.clear());

        document.getElementById('saveSignatureBtn').addEventListener('click', async () => {
            if (signaturePad.isEmpty()) return alert("Please provide your signature first.");
            
            const sigData = signaturePad.toDataURL('image/png');
            
            try {
                // Save the new signature to the database
                await fetch('/api/admin/signature', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: currentAdminProfile.username || activeAdminUsername, signature: sigData })
                });

                if (isLoggingOut) {
                    const logoutRes = await fetch('/api/admin-logout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: currentAdminProfile.username || activeAdminUsername })
                    });

                    if(logoutRes.ok) {
                        alert("Signature Saved! Timeout recorded.");
                        
                        // Visually clear the pad immediately
                        signaturePad.clear();
                        
                        document.getElementById('signatureOverlay').style.display = 'flex';
                        document.getElementById('saveSignatureBtn').disabled = true;
                        document.getElementById('clearSignatureBtn').disabled = true;

                        needsTimeout = false;
                        startLogoutCountdown();
                    } else {
                        alert("Error recording timeout in database.");
                    }
                } else {
                    alert("Signature Saved successfully!");
                    signaturePad.clear(); // Visually clear it after saving manually too
                }
                
            } catch (err) {
                alert("Server connection error.");
            }
        });

    } catch (error) {
        console.error("Profile load error:", error);
        document.getElementById('adminName').innerHTML = `Database Connection Error <span class="edit-icon">✏️</span>`;
        document.getElementById('logTableBody').innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px; color:red;">Failed to load data. Make sure MySQL is running.</td></tr>`;
    }
});

// --- AVATAR UPLOAD LOGIC ---
document.getElementById('avatarUpload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(event) {
        const base64String = event.target.result;
        
        document.getElementById('adminAvatarImg').src = base64String;
        document.getElementById('adminAvatarImg').style.display = 'block';
        document.getElementById('adminAvatarFallback').style.display = 'none';

        try {
            const res = await fetch('/api/admin/avatar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username: currentAdminProfile.username || activeAdminUsername, 
                    avatar: base64String 
                })
            });
            if (res.ok) alert("Avatar updated successfully!");
            else alert("Error saving avatar. File might be too large.");
        } catch (err) {
            alert("Connection error while saving avatar.");
        }
    };
    reader.readAsDataURL(file);
});

// --- CHANGE PASSWORD MODAL LOGIC ---
function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { 
    document.getElementById(id).style.display = 'none'; 
    document.getElementById('currPass').value = '';
    document.getElementById('newPass').value = '';
    document.getElementById('confNewPass').value = '';
}

window.onclick = function(e) {
    if (e.target.classList.contains('modal')) closeModal(e.target.id);
}

async function submitPasswordChange() {
    const currPass = document.getElementById('currPass').value;
    const newPass = document.getElementById('newPass').value;
    const confNewPass = document.getElementById('confNewPass').value;

    if (!currPass || !newPass || !confNewPass) return alert("Please fill out all fields.");
    if (newPass !== confNewPass) return alert("New passwords do not match!");
    
    const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!strongRegex.test(newPass)) {
        return alert("Weak Password! It must be at least 8 characters, contain 1 uppercase, 1 lowercase, and 1 number.");
    }

    try {
        const res = await fetch('/api/admin/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: currentAdminProfile.username || activeAdminUsername, 
                currentPassword: currPass,
                newPassword: newPass
            })
        });

        const data = await res.json();
        
        if (res.ok) {
            alert("Password updated successfully!");
            closeModal('passwordModal');
        } else {
            alert(data.message || "Failed to update password.");
        }
    } catch (err) {
        alert("Connection error.");
    }
}

// --- TIMEOUT & LOG TABLE LOGIC ---
function renderLogTable(logs) {
    const tbody = document.getElementById('logTableBody');
    tbody.innerHTML = '';
    
    needsTimeout = logs.some(log => !log.log_out);
    
    if (logs.length > 0) {
        logs.forEach((log, i) => {
            const timeOutDisplay = log.log_out 
                ? new Date(log.log_out).toLocaleTimeString() 
                : `<button class="btn-timeout" onclick="enableTimeOut()">Time out</button>`;
            
            tbody.innerHTML += `
                <tr>
                    <td>${i + 1}</td>
                    <td>${currentAdminProfile.id_number || 'N/A'}</td>
                    <td>${currentAdminProfile.fullname || 'Unknown'}</td>
                    <td>${new Date(log.log_in).toLocaleDateString()}</td>
                    <td>${new Date(log.log_in).toLocaleTimeString()}</td>
                    <td>${timeOutDisplay}</td>
                </tr>
            `;
        });
    } else {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px; color:#555;">No log history found.</td></tr>`;
    }
}

window.enableTimeOut = function() {
    isLoggingOut = true;
    document.getElementById('signatureOverlay').style.display = 'none';
    
    const saveBtn = document.getElementById('saveSignatureBtn');
    const clearBtn = document.getElementById('clearSignatureBtn');
    
    saveBtn.disabled = false; saveBtn.style.opacity = '1'; saveBtn.style.cursor = 'pointer';
    clearBtn.disabled = false; clearBtn.style.opacity = '1'; clearBtn.style.cursor = 'pointer';

    document.querySelector('.signature-container').scrollIntoView({ behavior: 'smooth' });
}

function startLogoutCountdown() {
    let seconds = 10;
    const btn = document.getElementById('sidebarLogoutBtn');
    
    if(timeoutInterval) clearInterval(timeoutInterval);
    
    timeoutInterval = setInterval(() => {
        btn.textContent = `Log out (${seconds}s)`;
        btn.style.setProperty('background-color', '#ef4444', 'important');
        btn.style.setProperty('color', 'white', 'important');
        
        if (seconds <= 0) {
            clearInterval(timeoutInterval);
            window.location.href = '/admin/login';
        }
        seconds--;
    }, 1000);
}

// LOGOUT VALIDATION
window.handleLogoutClick = async function() {
    if (needsTimeout) {
        alert("Action Required: You have an active session! Please click 'Time out' in the log table and provide your signature before logging out.");
        document.querySelector('.data-table').scrollIntoView({ behavior: 'smooth' });
        return;
    }
    
    try {
        await fetch('/api/admin-logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentAdminProfile.username || activeAdminUsername })
        });
    } catch(e) { console.error(e); }
    sessionStorage.removeItem('loggedInAdminUsername');
    window.location.href = '/admin/login';
};

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const menuItems = document.querySelectorAll('.sidebar-menu li');
    
    sidebar.classList.toggle('collapsed');
    
    // Add/Remove tilt animation class to each menu item
    menuItems.forEach((item, index) => {
        if (sidebar.classList.contains('collapsed')) {
            item.style.transitionDelay = `${index * 0.05}s`;
            item.classList.add('tilt-out');
        } else {
            item.style.transitionDelay = `${index * 0.05}s`;
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

// --- DATABASE BACKUP ---
async function downloadBackup() {
    const btn = document.getElementById('backupBtn');
    const originalHTML = btn.innerHTML;

    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Generating...`;
    btn.disabled = true;
    btn.style.background = '#6b7280';

    try {
        const res = await fetch('/api/admin/backup-database');

        if (!res.ok) {
            const err = await res.json();
            alert('Backup failed: ' + (err.error || 'Unknown error'));
            return;
        }

        // Extract filename from header
        const disposition = res.headers.get('Content-Disposition') || '';
        const nameMatch = disposition.match(/filename="(.+?)"/);
        const filename = nameMatch ? nameMatch[1] : 'BSU_Clinic_Backup.sql';

        // Trigger download
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (err) {
        alert('Connection error during backup: ' + err.message);
    } finally {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
        btn.style.background = '#1d4ed8';
    }
}