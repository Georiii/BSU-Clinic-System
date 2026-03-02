const srInput = document.getElementById('srcode');

srInput.addEventListener('blur', async () => {
    const response = await fetch(`/api/student/${srInput.value}`);
    if (response.ok) {
        const data = await response.json();
        // Auto-fill the read-only boxes on your form
        document.getElementById('name').value = data.fullname;
        document.getElementById('department').value = data.department;
        document.getElementById('program').value = data.program;
    } else {
        alert("SR Code not found in the master list.");
    }
});