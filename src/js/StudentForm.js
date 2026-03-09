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

            if (data.birthday) {
                document.getElementById('birthday').value = data.birthday;
                document.getElementById('age').value = calculateAge(data.birthday);
            }
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
            otherNeedsGroup.style.display = 'flex';
        } else {
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
        certTypeGroup.style.display = 'none';
        othersSpecifyGroup.style.display = 'none';

        if (this.value === 'Medical Certificate') {
            certTypeGroup.style.display = 'block';
        } else if (this.value === 'Others') {
            othersSpecifyGroup.style.display = 'block';
        }
    });
}

// 8. Form Submission with Validation and Visual Warnings
const medicalForm = document.getElementById('medicalForm');
if (medicalForm) {
    medicalForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // RESET BORDERS: Clear previous red borders
        document.querySelectorAll('input, select').forEach(el => {
            el.style.border = 'none';
        });

        // VALIDATION: Check standard required fields
        const requiredFields = [
            { id: 'srcode', name: 'SR Code' },
            { id: 'birthday', name: 'Birthday' },
            { id: 'gender', name: 'Gender' },
            { id: 'purposeSelect', name: 'Purpose of Visit' }
        ];

        let hasError = false;

        for (let field of requiredFields) {
            const element = document.getElementById(field.id);
            if (!element.value || element.value === "") {
                element.style.border = '2px solid red';
                hasError = true;
            }
        }

        // VALIDATION: Conditional fields
        if (specialNeedsSelect.value === 'Other') {
            const otherInput = document.getElementById('specialNeedsOther');
            if (!otherInput.value.trim()) {
                otherInput.style.border = '2px solid red';
                hasError = true;
            }
        }

        const selectedPurpose = purposeSelect.value;
        const selectedCertType = document.querySelector('input[name="cert_type"]:checked')?.value || null;

        if (selectedPurpose === 'Medical Certificate' && !selectedCertType) {
            alert("Please select a Certificate Type.");
            hasError = true;
        }

        if (selectedPurpose === 'Others') {
            const otherSpecify = document.getElementById('others_specify');
            if (!otherSpecify.value.trim()) {
                otherSpecify.style.border = '2px solid red';
                hasError = true;
            }
        }

        if (hasError) {
            alert("Please fill in all highlighted fields.");
            return;
        }

        // Prepare data matching your updated phpMyAdmin structure
        const formData = {
            srcode: srInput.value,
            fullname: document.getElementById('name').value,       // Captured for your database
            department: document.getElementById('department').value, // Captured for your database
            program: document.getElementById('program').value,       // Captured for your database
            visit_date: document.getElementById('visitDate').value,
            time_in: document.getElementById('timeIn').value,
            time_out: document.getElementById('timeOut').value || null,
            age: ageInput.value,
            gender: document.getElementById('gender').value, 
            special_needs: specialNeedsSelect.value === 'Other' ? document.getElementById('specialNeedsOther').value : specialNeedsSelect.value,
            
            purpose_medical_consult: selectedPurpose === 'Medical Consult' ? 1 : 0,
            purpose_dental: selectedPurpose === 'Dental' ? 1 : 0,
            purpose_med_cert: selectedPurpose === 'Medical Certificate' ? 1 : 0,
            purpose_pre_enrolment: selectedCertType === 'Enrolment' ? 1 : 0,
            
            cert_type: selectedCertType,
            purpose_others: selectedPurpose === 'Others' ? document.getElementById('others_specify').value : null
        };

        try {
            const response = await fetch('/api/submit-visit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                // Redirecting to the server-defined success route
                window.location.href = '/success';
            } else {
                alert("Error: Could not save visit data.");
            }
        } catch (error) {
            console.error("Submission error:", error);
            alert("Connection to server failed.");
        }
    });
}