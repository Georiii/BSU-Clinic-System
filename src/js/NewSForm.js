function transitionToPage(url) {
    const container = document.querySelector('.registration-card');
    if (container) container.classList.add('page-fade-out');
    setTimeout(() => { window.location.href = url; }, 400); 
}

const registrationForm = document.getElementById('studentRegistrationForm');
const successModal = document.getElementById('successModal');
const doneBtn = document.getElementById('doneBtn');

registrationForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('fullname').value; 
    const formData = {
        srcode: document.getElementById('srcode').value,
        fullname: name,
        department: document.getElementById('department').value,
        program: document.getElementById('program').value,
        birthday: document.getElementById('birthday').value,
        gender: document.getElementById('gender').value
    };

    try {
        const response = await fetch('/api/register-student', {
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
            alert("Error: Registration failed. SR-Code might already exist.");
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