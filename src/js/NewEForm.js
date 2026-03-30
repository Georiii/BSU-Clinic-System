
function transitionToPage(url) {
    const container = document.querySelector('.registration-card');
    if (container) container.classList.add('page-fade-out');
    setTimeout(() => { window.location.href = url; }, 400); 
}

const registrationForm = document.getElementById('registrationForm');
const successModal = document.getElementById('successModal');
const doneBtn = document.getElementById('doneBtn');

registrationForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('fullname').value; 
    const formData = {
        employee_id: document.getElementById('employee_id').value,
        fullname: name,
        department: document.getElementById('department').value,
        position: document.getElementById('position').value,
        employment_type: document.getElementById('employment_type').value,
        employment_status: document.getElementById('employment_status').value
    };

    try {
        const response = await fetch('/api/register-employee', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            
            const modalTitle = successModal.querySelector('h2');
            modalTitle.textContent = `You registered successfully, ${name}!`;
            
            successModal.style.display = 'flex';

            
            setTimeout(() => {
                transitionToPage('/choose'); 
            }, 5000);
        } else {
            alert("Error: Registration failed. ID might already exist.");
        }
    } catch (error) {
        console.error("Error:", error);
    }
});

doneBtn.addEventListener('click', () => {
    transitionToPage('/choose'); 
});

document.getElementById('closeBtn').addEventListener('click', () => {
    transitionToPage('/choose'); 
});