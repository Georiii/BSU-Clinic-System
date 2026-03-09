document.getElementById('closeButton').addEventListener('click', () => {
    // This takes you back to SLandingpage.html via the root route
    window.location.href = '/';
});

// Automatic redirection after 5 seconds
setTimeout(() => {
    window.location.href = 'SLandingpage.html';
}, 10000);