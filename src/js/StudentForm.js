const srInput = document.getElementById('srcode');
const birthdayInput = document.getElementById('birthday');
const ageInput = document.getElementById('age');

// 1. Function to calculate age from a date string
function calculateAge(birthDateValue) {
    if (!birthDateValue) return '';
    const birthDate = new Date(birthDateValue);
    const today = new Date();
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age >= 0 ? age : '';
}

// 2. Logic for SR Code Auto-fill
srInput.addEventListener('blur', async () => {
    const code = srInput.value.trim();
    if (!code) return;

    try {
        const response = await fetch(`/api/student/${code}`);
        
        if (response.ok) {
            const data = await response.json();
            
            document.getElementById('name').value = data.fullname;
            document.getElementById('department').value = data.department;
            document.getElementById('program').value = data.program;

            // Auto-fill Birthday and Calculate Age
            if (data.birthday) {
                document.getElementById('birthday').value = data.birthday;
                document.getElementById('age').value = calculateAge(data.birthday);
            }
            
            console.log("Data pulled for:", data.fullname);
        } else {
            alert("SR Code not found in the master list.");
        }
    } catch (error) {
        console.error("Connection error:", error);
    }
});

// 3. Logic for Manual Birthday Change
if (birthdayInput) {
    ['change', 'input'].forEach(event => {
        birthdayInput.addEventListener(event, () => {
            ageInput.value = calculateAge(birthdayInput.value);
        });
    });
}

// 4. Close Button Logic
const closeBtn = document.getElementById('closeBtn');
if (closeBtn) {
    closeBtn.addEventListener('click', () => {
        window.location.href = '/choose';
    });
}

// 5. Initial Date and Time In
function setInitialDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const formattedTime = `${hours}:${minutes}`;

    const dateInput = document.getElementById('visitDate');
    const timeInInput = document.getElementById('timeIn');

    if (dateInput) dateInput.value = formattedDate;
    if (timeInInput) timeInInput.value = formattedTime;
}

document.addEventListener('DOMContentLoaded', setInitialDateTime);

// 6. Special Needs Logic
const specialNeedsSelect = document.getElementById('specialNeeds');
const otherNeedsGroup = document.getElementById('otherNeedsGroup');

if (specialNeedsSelect) {
    specialNeedsSelect.addEventListener('change', function() {
        if (this.value === 'Other') {
            // Show the textbox if 'Other' is selected
            otherNeedsGroup.style.display = 'flex';
        } else {
            // Hide and clear the textbox if anything else is selected
            otherNeedsGroup.style.display = 'none';
            document.getElementById('specialNeedsOther').value = '';
        }
    });
}

// 7. Purpose of Visit Logic
const purposeSelect = document.getElementById('purposeSelect');
const certTypeGroup = document.getElementById('certTypeGroup');
const othersSpecifyGroup = document.getElementById('othersSpecifyGroup');

if (purposeSelect) {
    purposeSelect.addEventListener('change', function() {
        // Reset both groups to hidden initially
        certTypeGroup.style.display = 'none';
        othersSpecifyGroup.style.display = 'none';

        if (this.value === 'Medical Certificate') {
            certTypeGroup.style.display = 'block';
        } else if (this.value === 'Others') {
            othersSpecifyGroup.style.display = 'block';
        }
    });
}