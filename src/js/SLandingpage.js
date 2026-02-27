document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('loginBtn');
    const timeoutBtn = document.getElementById('timeoutBtn');

    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            window.location.href = '/choose';
        });
    }

    if (timeoutBtn) {
        timeoutBtn.addEventListener('click', () => {
            alert("Time Out Recorded!");
        });
    }
});