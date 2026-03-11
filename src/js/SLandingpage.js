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
            // Redirects to the Time Out Form page
            window.location.href = '/html/TimeoutForm.html';
        });
    }
});