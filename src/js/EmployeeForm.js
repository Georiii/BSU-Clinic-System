// --- Helper function for smooth page transitions ---
function transitionToPage(url) {
    const container = document.querySelector('.main-container') || document.querySelector('.emerald-card');
    if (container) container.classList.add('page-fade-out');
    setTimeout(() => { window.location.href = url; }, 400); 
}

const employeeIdInput = document.getElementById('employeeId');
const birthdayInput = document.getElementById('birthday');
const ageInput = document.getElementById('age');

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

async function tryAutofillEmployee(employeeId) {
    if (!employeeId) return;

    try {
        const response = await fetch(`/api/employee/${employeeId}`);

        if (response.ok) {
            const data = await response.json();

            const name = document.getElementById('name');
            const department = document.getElementById('department');
            const position = document.getElementById('position'); 
            const employmentType = document.getElementById('employmentType');
            const employmentStatus = document.getElementById('employmentStatus');

            if (name && data.fullname) name.value = data.fullname;
            if (department && data.department) department.value = data.department;
            if (position && data.position) position.value = data.position;
            
            if (employmentType && data.employment_type) employmentType.value = data.employment_type;
            if (employmentStatus && data.employment_status) employmentStatus.value = data.employment_status;

            if (data.birthday) {
                document.getElementById('birthday').value = data.birthday;
                document.getElementById('age').value = calculateAge(data.birthday);
            }
        } else if (response.status === 404) {
            alert('Employee ID not found in the master list.');
            ['name', 'department', 'position', 'employmentType', 'employmentStatus'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
        }
    } catch (error) {
        console.error('Connection error:', error);
    }
}

if (employeeIdInput) {
    employeeIdInput.addEventListener('blur', () => {
        tryAutofillEmployee(employeeIdInput.value.trim());
    });
}

if (birthdayInput) {
    ['change', 'input'].forEach((event) => {
        birthdayInput.addEventListener(event, () => {
            ageInput.value = calculateAge(birthdayInput.value);
        });
    });
}

const closeBtn = document.getElementById('closeBtn');
if (closeBtn) {
    closeBtn.addEventListener('click', () => {
        transitionToPage('/choose'); 
    });
}

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

// Special Needs Logic (UPDATED)
const specialNeedsSelect = document.getElementById('specialNeeds');
const otherNeedsGroup = document.getElementById('otherNeedsGroup');
const pwdTypeGroup = document.getElementById('pwdTypeGroup');

if (specialNeedsSelect) {
    specialNeedsSelect.addEventListener('change', function () {
        if (otherNeedsGroup) otherNeedsGroup.style.display = 'none';
        if (pwdTypeGroup) pwdTypeGroup.style.display = 'none';

        if (this.value === 'Other') {
            if (otherNeedsGroup) otherNeedsGroup.style.display = 'flex';
        } else if (this.value === 'Pwd') {
            if (pwdTypeGroup) pwdTypeGroup.style.display = 'flex';
        } else {
            const other = document.getElementById('specialNeedsOther');
            const pwdTypeSelect = document.getElementById('pwdTypeSelect');
            if (other) other.value = '';
            if (pwdTypeSelect) pwdTypeSelect.value = '';
        }
    });
}

const purposeSelect = document.getElementById('purposeSelect');
const certTypeGroup = document.getElementById('certTypeGroup');
const othersSpecifyGroup = document.getElementById('othersSpecifyGroup');
const othersSpecifyInput = document.getElementById('others_specify');
const dentalServiceGroup = document.getElementById('dentalServiceGroup');

if (purposeSelect) {
    purposeSelect.addEventListener('change', () => {
        if (certTypeGroup) certTypeGroup.style.display = 'none';
        if (othersSpecifyGroup) othersSpecifyGroup.style.display = 'none';
        if (dentalServiceGroup) dentalServiceGroup.style.display = 'none';

        if (othersSpecifyInput) othersSpecifyInput.value = '';
        
        // Clear all radios when switching
        document.querySelectorAll('input[name="cert_type"], input[name="dental_service_type"]').forEach((r) => {
            r.checked = false;
        });

        if (purposeSelect.value === 'Medical Certificate') {
            if (certTypeGroup) certTypeGroup.style.display = 'block';
        } else if (purposeSelect.value === 'Others') {
            if (othersSpecifyGroup) othersSpecifyGroup.style.display = 'block';
        } else if (purposeSelect.value === 'Dental') {
            if (dentalServiceGroup) dentalServiceGroup.style.display = 'block';
        }
    });
}

const canvas = document.getElementById('signatureCanvas');
if (canvas) {
    const ctx = canvas.getContext('2d');
    let isDrawing = false;

    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 2 || e.button === 0) {
            isDrawing = true;
            ctx.beginPath();
            ctx.moveTo(e.offsetX, e.offsetY);
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (isDrawing) {
            ctx.lineTo(e.offsetX, e.offsetY);
            ctx.stroke();
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
        }
    });

    window.addEventListener('mouseup', () => {
        isDrawing = false;
    });

    document.getElementById('clearSignatureBtn').addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height); 
    });
}

const form = document.getElementById('employeeForm');
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // RESET BORDERS
        document.querySelectorAll('input, select').forEach(el => {
            el.style.border = 'none';
        });

        // VALIDATION
        const requiredFields = [
            { id: 'employeeId', name: 'Employee ID' },
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

        if (specialNeedsSelect.value === 'Other') {
            const otherInput = document.getElementById('specialNeedsOther');
            if (!otherInput.value.trim()) {
                otherInput.style.border = '2px solid red';
                hasError = true;
            }
        }

        // PWD Validation
        if (specialNeedsSelect.value === 'Pwd') {
            const pwdTypeSelect = document.getElementById('pwdTypeSelect');
            if (!pwdTypeSelect.value) {
                pwdTypeSelect.style.border = '2px solid red';
                hasError = true;
            }
        }

        const selectedPurpose = purposeSelect.value;
        const selectedCertType = document.querySelector('input[name="cert_type"]:checked')?.value || null;
        const selectedDentalService = document.querySelector('input[name="dental_service_type"]:checked')?.value || null;

        if (selectedPurpose === 'Medical Certificate' && !selectedCertType) {
            alert("Please select a Certificate Type.");
            hasError = true;
        }

        if (selectedPurpose === 'Dental' && !selectedDentalService) {
            alert("Please select a Dental Service.");
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

        // Process signature
        const signatureData = canvas ? canvas.toDataURL() : null;
        if (document.getElementById('signatureData')) {
            document.getElementById('signatureData').value = signatureData;
        }

        const formData = {
            employee_id: document.getElementById('employeeId').value,
            visit_date: document.getElementById('visitDate').value,
            time_in: document.getElementById('timeIn').value,
            time_out: document.getElementById('timeOut').value || null,
            fullname: document.getElementById('name').value,
            department: document.getElementById('department').value,
            position: document.getElementById('position').value,
            employment_type: document.getElementById('employmentType').value,
            employment_status: document.getElementById('employmentStatus').value,
            birthday: document.getElementById('birthday').value,
            age: document.getElementById('age').value,
            gender: document.getElementById('gender').value,
            
            // UPDATED DATA SENT TO DATABASE
            special_needs: specialNeedsSelect.value === 'Other' ? document.getElementById('specialNeedsOther').value : specialNeedsSelect.value,
            pwd_type: specialNeedsSelect.value === 'Pwd' ? document.getElementById('pwdTypeSelect').value : null,
            
            purpose_of_visit: selectedPurpose, 
            certificate_type: selectedCertType,
            dental_service_type: selectedDentalService,
            others_specify: selectedPurpose === 'Others' ? document.getElementById('others_specify').value : null,
            signature: signatureData 
        };

        try {
            const response = await fetch('/api/submit-employee-visit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                transitionToPage('/success'); 
            } else {
                alert('Error submitting form. Please check your database connection.');
            }
        } catch (error) {
            console.error('Submission Error:', error);
            alert('Could not connect to the server.');
        }
    });
}