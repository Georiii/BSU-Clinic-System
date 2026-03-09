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
        window.location.href = '/choose';
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

const specialNeedsSelect = document.getElementById('specialNeeds');
const otherNeedsGroup = document.getElementById('otherNeedsGroup');

if (specialNeedsSelect) {
    specialNeedsSelect.addEventListener('change', function () {
        if (this.value === 'Other') {
            otherNeedsGroup.style.display = 'flex';
        } else {
            otherNeedsGroup.style.display = 'none';
            const other = document.getElementById('specialNeedsOther');
            if (other) other.value = '';
        }
    });
}

const purposeSelect = document.getElementById('purposeSelect');
const certTypeGroup = document.getElementById('certTypeGroup');
const othersSpecifyGroup = document.getElementById('othersSpecifyGroup');
const othersSpecifyInput = document.getElementById('others_specify');

if (purposeSelect) {
    purposeSelect.addEventListener('change', () => {
        if (certTypeGroup) certTypeGroup.style.display = 'none';
        if (othersSpecifyGroup) othersSpecifyGroup.style.display = 'none';

        if (othersSpecifyInput) othersSpecifyInput.value = '';
        document.querySelectorAll('input[name="cert_type"]').forEach((r) => {
            r.checked = false;
        });

        if (purposeSelect.value === 'Medical Certificate') {
            if (certTypeGroup) certTypeGroup.style.display = 'block';
        } else if (purposeSelect.value === 'Others') {
            if (othersSpecifyGroup) othersSpecifyGroup.style.display = 'block';
        }
    });
}

const form = document.getElementById('employeeForm');
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const timeOutField = document.getElementById('timeOut');
        if (timeOutField && !timeOutField.value) {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            timeOutField.value = `${hours}:${minutes}`;
        }

        const formData = {
            employee_id: document.getElementById('employeeId').value,
            visit_date: document.getElementById('visitDate').value,
            time_in: document.getElementById('timeIn').value,
            time_out: document.getElementById('timeOut').value,
            fullname: document.getElementById('name').value,
            department: document.getElementById('department').value,
            position: document.getElementById('position').value,
            employment_type: document.getElementById('employmentType').value,
            employment_status: document.getElementById('employmentStatus').value,
            birthday: document.getElementById('birthday').value,
            age: document.getElementById('age').value,
            gender: document.getElementById('gender').value,
            special_needs: document.getElementById('specialNeeds').value,
            special_needs_specify: document.getElementById('specialNeedsOther')?.value || null,
            purpose_of_visit: document.getElementById('purposeSelect').value,
            certificate_type: document.querySelector('input[name="cert_type"]:checked')?.value || null,
            others_specify: document.getElementById('others_specify')?.value || null
        };

        try {
            const response = await fetch('/api/submit-employee-visit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                window.location.href = '/success';
            } else {
                alert('Error submitting form. Please check your database connection.');
            }
        } catch (error) {
            console.error('Submission Error:', error);
            alert('Could not connect to the server.');
        }
    });
}