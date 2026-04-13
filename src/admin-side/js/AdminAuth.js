// --- 1. SMOOTH PAGE TRANSITION ---
function transitionTo(url) {
    const container = document.querySelector('.split-container');
    if (container) {
        container.classList.add('page-fade-out');
        setTimeout(() => { window.location.href = url; }, 400);
    } else {
        window.location.href = url;
    }
}

// --- 2. LOGIN LOGIC ---
const loginForm = document.getElementById('adminLoginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const res = await fetch('/api/admin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (res.ok) {
                alert("Login Successful! Redirecting to Dashboard...");
                window.location.href = '/admin/profile'; 
            } else {
                const data = await res.json();
                alert(data.message || "Invalid username or password");
            }
        } catch (error) {
            console.error("Login error:", error);
            alert("Server connection error.");
        }
    });
}

// --- 3. REGISTRATION LOGIC ---
const registerForm = document.getElementById('adminRegisterForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        // Added id_number variable
        const id_number = document.getElementById('regIdNumber').value;
        const fullname = document.getElementById('regFullName').value;
        const username = document.getElementById('regUsername').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('regConfirmPassword').value;

        // 1. Check if passwords match
        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        // 2. STRONG PASSWORD CHECKER
        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!strongPasswordRegex.test(password)) {
            alert("Weak Password! It must be at least 8 characters long, contain an uppercase letter, a lowercase letter, and a number.");
            return;
        }

        try {
            const res = await fetch('/api/admin-register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Pass id_number in the request body
                body: JSON.stringify({ id_number, fullname, username, email, password })
            });

            if (res.ok) {
                alert("Account created successfully!");
                transitionTo('/admin/login');
            } else {
                const data = await res.json();
                alert("Registration failed: " + (data.message || "Username may already exist."));
            }
        } catch (error) {
            console.error("Registration error:", error);
            alert("Server connection error.");
        }
    });
}

// --- 4. FORGOT PASSWORD LOGIC ---
let resetUsernameContext = "";

const sendCodeForm = document.getElementById('sendCodeForm');
if (sendCodeForm) {
    sendCodeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = sendCodeForm.querySelector('button');
        btn.textContent = "Sending...";
        btn.disabled = true;

        resetUsernameContext = document.getElementById('resetUsername').value;
        
        try {
            const res = await fetch('/api/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: resetUsernameContext })
            });

            if (res.ok) {
                document.getElementById('step1').style.display = 'none';
                document.getElementById('step2').style.display = 'block';
            } else {
                alert("Username not found in the system.");
            }
        } catch (error) {
            console.error(error);
            alert("Server connection error.");
        } finally {
            btn.textContent = "Send Verification Code";
            btn.disabled = false;
        }
    });
}

const verifyCodeForm = document.getElementById('verifyCodeForm');
if (verifyCodeForm) {
    verifyCodeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('resetCode').value;
        
        try {
            const res = await fetch('/api/verify-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: resetUsernameContext, code: code })
            });

            if (res.ok) {
                document.getElementById('step2').style.display = 'none';
                document.getElementById('step3').style.display = 'block';
            } else {
                alert("Invalid or Expired Code!");
            }
        } catch (error) {
            console.error(error);
            alert("Server connection error.");
        }
    });
}

const newPassForm = document.getElementById('newPassForm');
if (newPassForm) {
    newPassForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPass = document.getElementById('newPass').value;
        const confirmNewPass = document.getElementById('confirmNewPass').value;

        if (newPass !== confirmNewPass) {
            alert("Passwords do not match!");
            return;
        }

        try {
            const res = await fetch('/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: resetUsernameContext, newPassword: newPass })
            });

            if (res.ok) {
                alert("Password reset successfully!");
                transitionTo('/admin/login');
            } else {
                alert("Failed to reset password.");
            }
        } catch (error) {
            console.error(error);
            alert("Server connection error.");
        }
    });
}

// --- 5. PASSWORD VISIBILITY TOGGLE ---
function toggleVisibility(inputId, iconElement) {
    const input = document.getElementById(inputId);
    if (input.type === "password") {
        input.type = "text";
        iconElement.textContent = "⌣"; 
    } else {
        input.type = "password";
        iconElement.textContent = "👁"; 
    }
}