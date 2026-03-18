document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Date and Time Logic
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const formattedTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    document.getElementById('visitDate').value = formattedDate;
    document.getElementById('timeIn').value = formattedTime;

    // 2. Age Calculation Logic
    const birthdayInput = document.getElementById('birthday');
    const ageInput = document.getElementById('age');

    if (birthdayInput) {
        birthdayInput.addEventListener('change', () => {
            if (birthdayInput.value) {
                const birthDate = new Date(birthdayInput.value);
                let age = now.getFullYear() - birthDate.getFullYear();
                const m = now.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) {
                    age--;
                }
                ageInput.value = age >= 0 ? age : '';
            }
        });
    }

    // 3. Special Needs Logic 
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

    // 4. Purpose of Visit Logic
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

    // 5. Signature Canvas Logic
    const canvas = document.getElementById('signatureCanvas');
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

    // 6. Form Submission 
    document.getElementById('visitorForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const signatureData = canvas.toDataURL(); 
        document.getElementById('signatureData').value = signatureData;

        const formData = {
            idNo: document.getElementById('idNo').value,
            visit_date: document.getElementById('visitDate').value,
            time_in: document.getElementById('timeIn').value,
            purpose: document.getElementById('purposeSelect').value,
            fullname: document.getElementById('fullname').value,
            birthday: document.getElementById('birthday').value,
            age: document.getElementById('age').value,
            gender: document.getElementById('gender').value,
            
            special_needs: document.getElementById('specialNeeds').value,
            special_needs_specify: document.getElementById('specialNeedsOther')?.value || null,
            certificate_type: document.querySelector('input[name="cert_type"]:checked')?.value || null,
            others_specify: document.getElementById('others_specify')?.value || null,
            
            signature: signatureData
        };

        try {
            const response = await fetch('/api/submit-visitor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                window.location.href = '/success';
            } else {
                alert("Error submitting visitor form.");
            }
        } catch (error) {
            console.error("Submission error:", error);
        }
    });

    // 7. Close Button
    document.getElementById('closeBtn').addEventListener('click', () => {
        window.location.href = '/choose';
    });
});