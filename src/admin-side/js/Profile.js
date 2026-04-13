// Keep track of the active admin data globally for the timeout logic
let currentAdminProfile = {};
let isLoggingOut = false;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('/api/admin/profile?username=Mark_G'); 
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        
        const data = await res.json();
        
        currentAdminProfile = data?.profile || {};
        const logs = data?.logs || [];

        // 1. Populate Profile UI
        document.getElementById('adminName').innerHTML = `${currentAdminProfile.fullname || 'Unknown Admin'} <span class="edit-icon">✏️</span>`;
        document.getElementById('adminId').textContent = currentAdminProfile.id_number || 'N/A';
        document.getElementById('adminPosition').textContent = currentAdminProfile.position || 'N/A';
        document.getElementById('adminDept').textContent = currentAdminProfile.department || 'N/A';
        document.getElementById('adminStatus').textContent = currentAdminProfile.employment_status || 'N/A';
        document.getElementById('adminType').textContent = currentAdminProfile.employment_type || 'N/A';

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
            
            signaturePad.clear(); 
            if (currentAdminProfile.signature) {
                signaturePad.fromDataURL(currentAdminProfile.signature);
            }
        }
        
        window.addEventListener("resize", resizeCanvas);
        resizeCanvas();

        // 4. Button Actions
        document.getElementById('clearSignatureBtn').addEventListener('click', () => signaturePad.clear());

        document.getElementById('saveSignatureBtn').addEventListener('click', async () => {
            if (signaturePad.isEmpty()) return alert("Please provide your signature first.");
            
            const sigData = signaturePad.toDataURL('image/png');
            
            try {
                // Save signature
                await fetch('/api/admin/signature', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: currentAdminProfile.username || 'Mark_G', signature: sigData })
                });

                // If this submission was triggered by the timeout button
                if (isLoggingOut) {
                    // Record the logout time in the database
                    const logoutRes = await fetch('/api/admin-logout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: currentAdminProfile.username || 'Mark_G' })
                    });

                    if(logoutRes.ok) {
                        alert("Signature Saved! Timeout recorded.");
                        
                        // Disable the pad again
                        document.getElementById('signatureOverlay').style.display = 'flex';
                        document.getElementById('saveSignatureBtn').disabled = true;
                        document.getElementById('clearSignatureBtn').disabled = true;

                        // Start 10-second countdown to auto-redirect
                        startLogoutCountdown();
                    } else {
                        alert("Error recording timeout in database.");
                    }
                } else {
                    alert("Signature Saved successfully!");
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

// Function to render the table so it can be refreshed
function renderLogTable(logs) {
    const tbody = document.getElementById('logTableBody');
    tbody.innerHTML = '';
    
    if (logs.length > 0) {
        logs.forEach((log, i) => {
            // If log_out is empty, render the Time out button, else show the time
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

// Unlocks the signature pad when "Time out" is clicked in the table
window.enableTimeOut = function() {
    isLoggingOut = true;
    
    // Hide overlay and enable buttons
    document.getElementById('signatureOverlay').style.display = 'none';
    
    const saveBtn = document.getElementById('saveSignatureBtn');
    const clearBtn = document.getElementById('clearSignatureBtn');
    
    saveBtn.disabled = false;
    saveBtn.style.opacity = '1';
    saveBtn.style.cursor = 'pointer';
    
    clearBtn.disabled = false;
    clearBtn.style.opacity = '1';
    clearBtn.style.cursor = 'pointer';

    // Smooth scroll down to the signature pad
    document.querySelector('.signature-container').scrollIntoView({ behavior: 'smooth' });
}

// Handles the 10 second auto-redirect
function startLogoutCountdown() {
    let seconds = 10;
    const sidebarLogoutBtn = document.getElementById('sidebarLogoutBtn');
    
    const interval = setInterval(() => {
        sidebarLogoutBtn.textContent = `Log out (${seconds}s)`;
        if (seconds <= 0) {
            clearInterval(interval);
            window.location.href = '/admin/login';
        }
        seconds--;
    }, 1000);
}