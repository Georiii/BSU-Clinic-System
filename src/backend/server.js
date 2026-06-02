require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const path = require('path');
const { exec } = require('child_process'); 
const db = require('./db'); 
const bcrypt = require('bcrypt');
const ExcelJS = require('exceljs');
const { sendPasswordResetCode, maskEmail } = require('./mailer');
const app = express();
const PORT = 3000;

// --- MIDDLEWARE ---
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..')));

// --- GLOBAL CONFIG ---
db.query("SET time_zone = '+08:00'", (err) => {
    if (err) console.error("Error setting timezone:", err);
    else console.log("Database timezone set to +08:00 (Manila Time)");
});

// --- CLIENT HTML ROUTES ---
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, '..', 'html', 'SLandingpage.html')); });
app.get('/choose', (req, res) => { res.sendFile(path.join(__dirname, '..', 'html', 'SChoose.html')); });
app.get('/html/StudentForm.html', (req, res) => { res.sendFile(path.join(__dirname, '..', 'html', 'StudentForm.html')); });
app.get('/html/EmployeeForm.html', (req, res) => { res.sendFile(path.join(__dirname, '..', 'html', 'EmployeeForm.html')); });
app.get('/success', (req, res) => { res.sendFile(path.join(__dirname, '..', 'html', 'SuccessPage.html')); });
app.get('/html/NewSForm.html', (req, res) => { res.sendFile(path.join(__dirname, '..', 'html', 'NewSForm.html')); });
app.get('/html/NewEForm.html', (req, res) => { res.sendFile(path.join(__dirname, '..', 'html', 'NewEForm.html')); });
app.get('/html/TimeoutForm.html', (req, res) => { res.sendFile(path.join(__dirname, '..', 'html', 'TimeoutForm.html')); });
app.get('/html/VisitorForm.html', (req, res) => { res.sendFile(path.join(__dirname, '..', 'html', 'VisitorForm.html')); });

// --- ADMIN HTML ROUTES ---
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'admin-side', 'html', 'ALandingPage.html'));
});
app.get('/admin/login', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'admin-side', 'html', 'Login.html'));
});
app.get('/admin/register', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'admin-side', 'html', 'Registration.html'));
});
app.get('/admin/forgot-password', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'admin-side', 'html', 'AdminForgotPass.html'));
});
app.get('/admin/profile', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'admin-side', 'html', 'Profile.html')); 
});
app.get('/admin/clients', (req, res) => {
     res.sendFile(path.join(__dirname, '..', 'admin-side', 'html', 'ClientManagement.html')); 
});
app.get('/admin/inventory', (req, res) => {
     res.sendFile(path.join(__dirname, '..', 'admin-side', 'html', 'Inventory.html')); 
});

app.get('/admin/reports', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'admin-side', 'html', 'Report.html'));
});

// --- API ROUTES ---

app.get('/api/generate-visitor-id', (req, res) => {
    const sql = "SELECT idNo FROM visitor_logs WHERE visit_date = CURDATE() ORDER BY visit_id DESC LIMIT 1";
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json(err);
        let nextId = "0001"; 
        if (result.length > 0 && result[0].idNo) {
            const lastIdNum = parseInt(result[0].idNo, 10);
            if (!isNaN(lastIdNum)) {
                nextId = String(lastIdNum + 1).padStart(4, '0'); 
            }
        }
        res.json({ nextId });
    });
});

app.get('/api/symptoms', (req, res) => {
    db.query("SELECT * FROM master_symptoms ORDER BY symp_name ASC", (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results || []);
    });
});

app.get('/api/medicines', (req, res) => {
    db.query("SELECT * FROM master_medicines ORDER BY generic_name ASC", (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results || []);
    });
});

app.get('/api/student/:srcode', (req, res) => {
    const sql = "SELECT fullname, department, program FROM students WHERE srcode = ?";
    db.query(sql, [req.params.srcode], (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.length > 0) res.json(result[0]); 
        else res.status(404).json({ message: "Student not found" });
    });
});

app.get('/api/employee/:id', (req, res) => {
    const sql = "SELECT fullname, department, position, employment_type, employment_status FROM employees WHERE TRIM(employee_id) = ?";
    db.query(sql, [req.params.id], (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.length > 0) res.json(result[0]); 
        else res.status(404).json({ message: "Employee not found" });
    });
});

app.post('/api/submit-visit', (req, res) => {
    const data = req.body;
    db.query("INSERT INTO clinic_visits SET ?", data, (err) => {
        if (err) return res.status(500).json(err);
        res.status(200).json({ message: "Visit recorded!" });
    });
});

app.post('/api/submit-employee-visit', (req, res) => {
    const data = req.body;
    db.query("INSERT INTO employee_clinic_visit SET ?", data, (err) => {
        if (err) return res.status(500).json(err);
        res.status(200).json({ message: "Employee visit recorded!" });
    });
});

app.post('/api/submit-visitor', (req, res) => {
    const data = req.body;
    const sql = "INSERT INTO visitor_logs SET ?";
    db.query(sql, data, (err) => {
        if (err) {
            console.error("Database Insert Error:", err);
            return res.status(500).json(err);
        }
        res.status(200).json({ message: "Visitor recorded successfully!" });
    });
});

app.post('/api/register-employee', (req, res) => {
    db.query("INSERT INTO employees SET ?", req.body, (err) => {
        if (err) return res.status(500).json(err);
        res.status(200).json({ message: "Registration successful" });
    });
});

app.post('/api/register-student', (req, res) => {
    db.query("INSERT INTO students SET ?", req.body, (err) => {
        if (err) return res.status(500).json(err);
        res.status(200).json({ message: "Student registered successfully!" });
    });
});

// --- TIME OUT API ROUTES ---
app.get('/api/active-student-visits', (req, res) => {
    const sql = `SELECT v.visit_id, v.srcode, s.fullname, v.time_in, v.time_out, 
                        v.purpose_medical_consult, v.purpose_dental, v.purpose_blood_pressure, 
                        v.purpose_med_cert, v.purpose_pre_enrolment 
                 FROM clinic_visits v JOIN students s ON v.srcode = s.srcode 
                 WHERE v.visit_date = CURDATE() ORDER BY v.time_in ASC`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results || []);
    });
});

app.post('/api/timeout-student/:id', (req, res) => {
    const visitId = req.params.id;
    const data = req.body;

    const sql = `UPDATE clinic_visits 
                 SET time_out = CURTIME(), 
                     blood_pressure = ?, 
                     consideration = ?, 
                     cert_status = ?, 
                     hold_reason = ?,
                     is_confined = CASE WHEN TIMESTAMPDIFF(MINUTE, time_in, CURTIME()) > 40 THEN 'Yes' ELSE 'No' END
                 WHERE visit_id = ?`;
    
    const params = [
        data.blood_pressure || null, 
        data.consideration || null, 
        data.cert_status || null, 
        data.hold_reason || null, 
        visitId
    ];

    db.query(sql, params, (err) => {
        if (err) return res.status(500).json(err);

        if (data.symptoms && data.symptoms.length > 0) {
            const sympSql = "INSERT INTO recorded_symptoms (visit_id, user_type, symptom_name) VALUES ?";
            const sympValues = data.symptoms.map(s => [visitId, 'student', s]);
            db.query(sympSql, [sympValues], (err) => { if(err) console.error(err); });
        }

        if (data.medicines && data.medicines.length > 0) {
            const medSql = "INSERT INTO dispensed_medicines (visit_id, user_type, medicine_generic, medicine_brand, quantity_box, pieces) VALUES ?";
            const medValues = data.medicines.map(m => [visitId, 'student', m.generic, m.brand, m.quantity || null, m.pieces || null]);
            db.query(medSql, [medValues], (err) => {
                if(err) console.error(err);
            });
            // FIXED: Reduce stock in master_medicines for each dispensed medicine
            data.medicines.forEach(m => {
                const qtyToReduce = parseInt(m.quantity) || 0;
                const pcsToReduce = parseInt(m.pieces) || 0;
                if (qtyToReduce > 0 || pcsToReduce > 0) {
                    db.query(
                        "UPDATE master_medicines SET quantity = GREATEST(quantity - ?, 0), pieces = GREATEST(pieces - ?, 0) WHERE generic_name = ?",
                        [qtyToReduce, pcsToReduce, m.generic],
                        (err) => { if (err) console.error("Inventory update error:", err); }
                    );
                }
            });
        }

        res.status(200).json({ message: "Student timed out and data saved" });
    });
});

app.get('/api/active-employee-visits', (req, res) => {
    const sql = `SELECT v.visit_id, v.employee_id, e.fullname, v.time_in, v.time_out, v.purpose_of_visit 
                 FROM employee_clinic_visit v JOIN employees e ON v.employee_id = e.employee_id 
                 WHERE v.visit_date = CURDATE() ORDER BY v.time_in ASC`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results || []);
    });
});

app.post('/api/timeout-employee/:id', (req, res) => {
    const visitId = req.params.id;
    const data = req.body;

    const sql = `UPDATE employee_clinic_visit 
                 SET time_out = CURTIME(), 
                     blood_pressure = ?, 
                     consideration = ?, 
                     cert_status = ?, 
                     hold_reason = ?,
                     is_confined = CASE WHEN TIMESTAMPDIFF(MINUTE, time_in, CURTIME()) > 40 THEN 'Yes' ELSE 'No' END
                 WHERE visit_id = ?`;
                 
    const params = [
        data.blood_pressure || null, 
        data.consideration || null, 
        data.cert_status || null, 
        data.hold_reason || null, 
        visitId
    ];

    db.query(sql, params, (err) => {
        if (err) return res.status(500).json(err);

        if (data.symptoms && data.symptoms.length > 0) {
            const sympSql = "INSERT INTO recorded_symptoms (visit_id, user_type, symptom_name) VALUES ?";
            const sympValues = data.symptoms.map(s => [visitId, 'employee', s]);
            db.query(sympSql, [sympValues], (err) => { if(err) console.error(err); });
        }

        if (data.medicines && data.medicines.length > 0) {
            const medSql = "INSERT INTO dispensed_medicines (visit_id, user_type, medicine_generic, medicine_brand, quantity_box, pieces) VALUES ?";
            const medValues = data.medicines.map(m => [visitId, 'employee', m.generic, m.brand, m.quantity || null, m.pieces || null]);
            db.query(medSql, [medValues], (err) => {
                if(err) console.error(err);
            });
            // FIXED: Reduce stock in master_medicines for each dispensed medicine
            data.medicines.forEach(m => {
                const qtyToReduce = parseInt(m.quantity) || 0;
                const pcsToReduce = parseInt(m.pieces) || 0;
                if (qtyToReduce > 0 || pcsToReduce > 0) {
                    db.query(
                        "UPDATE master_medicines SET quantity = GREATEST(quantity - ?, 0), pieces = GREATEST(pieces - ?, 0) WHERE generic_name = ?",
                        [qtyToReduce, pcsToReduce, m.generic],
                        (err) => { if (err) console.error("Inventory update error:", err); }
                    );
                }
            });
        }

        res.status(200).json({ message: "Employee timed out and data saved" });
    });
});

app.get('/api/active-visitor-visits', (req, res) => {
    const sql = `SELECT visit_id, idNo, fullname, time_in, time_out, purpose 
                 FROM visitor_logs 
                 WHERE visit_date = CURDATE() ORDER BY time_in ASC`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results || []);
    });
});

app.post('/api/timeout-visitor/:id', (req, res) => {
    const visitId = req.params.id;
    const data = req.body;

    const sql = `UPDATE visitor_logs 
                 SET time_out = CURTIME(), 
                     blood_pressure = ?, 
                     consideration = ?, 
                     cert_status = ?, 
                     hold_reason = ?,
                     is_confined = CASE WHEN TIMESTAMPDIFF(MINUTE, time_in, CURTIME()) > 40 THEN 'Yes' ELSE 'No' END
                 WHERE visit_id = ?`;
                 
    const params = [
        data.blood_pressure || null, 
        data.consideration || null, 
        data.cert_status || null, 
        data.hold_reason || null, 
        visitId
    ];

    db.query(sql, params, (err) => {
        if (err) return res.status(500).json(err);

        if (data.symptoms && data.symptoms.length > 0) {
            const sympSql = "INSERT INTO recorded_symptoms (visit_id, user_type, symptom_name) VALUES ?";
            const sympValues = data.symptoms.map(s => [visitId, 'visitor', s]);
            db.query(sympSql, [sympValues], (err) => { if(err) console.error(err); });
        }

        if (data.medicines && data.medicines.length > 0) {
            const medSql = "INSERT INTO dispensed_medicines (visit_id, user_type, medicine_generic, medicine_brand, quantity_box, pieces) VALUES ?";
            const medValues = data.medicines.map(m => [visitId, 'visitor', m.generic, m.brand, m.quantity || null, m.pieces || null]);
            db.query(medSql, [medValues], (err) => {
                if(err) console.error(err);
            });
            // FIXED: Reduce stock in master_medicines for each dispensed medicine
            data.medicines.forEach(m => {
                const qtyToReduce = parseInt(m.quantity) || 0;
                const pcsToReduce = parseInt(m.pieces) || 0;
                if (qtyToReduce > 0 || pcsToReduce > 0) {
                    db.query(
                        "UPDATE master_medicines SET quantity = GREATEST(quantity - ?, 0), pieces = GREATEST(pieces - ?, 0) WHERE generic_name = ?",
                        [qtyToReduce, pcsToReduce, m.generic],
                        (err) => { if (err) console.error("Inventory update error:", err); }
                    );
                }
            });
        }

        res.status(200).json({ message: "Visitor timed out and data saved" });
    });
});

// --- ADMIN API ROUTES ---

app.post('/api/admin-register', async (req, res) => {
    const { id_number, fullname, username, email, password } = req.body;
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.query("INSERT INTO admins (id_number, fullname, username, email, password) VALUES (?, ?, ?, ?, ?)", 
        [id_number, fullname, username, email, hashedPassword], (err) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: "Username already exists." });
                }
                return res.status(500).json(err);
            }
            res.status(200).json({ message: "Admin registered successfully!" });
        });
    } catch (error) {
        console.error("Hashing error:", error);
        res.status(500).json({ message: "Server error during registration." });
    }
});

app.post('/api/admin-login', (req, res) => {
    const { username, password } = req.body;
    
    db.query("SELECT * FROM admins WHERE username = ?", [username], async (err, result) => {
        if (err) return res.status(500).json(err);
        
        if (result.length > 0) {
            const adminUser = result[0];
            
            try {
                const match = await bcrypt.compare(password, adminUser.password);
                
                if (match) {
                    db.query("INSERT INTO admin_logs (username, log_in) VALUES (?, NOW())", [username], (logErr) => {
                        if (logErr) console.error("Error saving log:", logErr);
                        res.status(200).json({ message: "Login successful!" });
                    });
                } else {
                    res.status(401).json({ message: "Invalid username or password" });
                }
            } catch (error) {
                console.error("Comparison error:", error);
                res.status(500).json({ message: "Server error during login." });
            }
        } else {
            res.status(401).json({ message: "Invalid username or password" });
        }
    });
});

app.post('/api/admin-logout', (req, res) => {
    const { username } = req.body;
    db.query("UPDATE admin_logs SET log_out = NOW() WHERE username = ? AND log_out IS NULL ORDER BY log_in DESC LIMIT 1", [username], (err) => {
        if (err) return res.status(500).json(err);
        res.status(200).json({ message: "Logged out successfully!" });
    });
});

// --- FORGOT PASSWORD ROUTES ---
app.post('/api/forgot-password', (req, res) => {
    const { username } = req.body;
    db.query("SELECT * FROM admins WHERE username = ?", [username], async (err, result) => {
        if (err) return res.status(500).json(err);

        if (result.length === 0) {
            return res.status(404).json({ message: "Username not found" });
        }

        const admin = result[0];
        if (!admin.email) {
            return res.status(400).json({ message: "No personal email is registered for this account." });
        }

        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

        db.query("UPDATE admins SET reset_code = ? WHERE username = ?", [resetCode, username], async (updateErr) => {
            if (updateErr) return res.status(500).json(updateErr);

            try {
                await sendPasswordResetCode(admin.email, resetCode, admin.fullname);
                res.status(200).json({
                    message: "Verification code sent to your personal email.",
                    maskedEmail: maskEmail(admin.email)
                });
            } catch (mailErr) {
                console.error("Password reset email error:", mailErr);
                res.status(500).json({
                    message: mailErr.message || "Failed to send verification email. Please try again later."
                });
            }
        });
    });
});

app.post('/api/verify-code', (req, res) => {
    const { username, code } = req.body;
    db.query("SELECT * FROM admins WHERE username = ? AND reset_code = ?", [username, code], (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.length > 0) {
            res.status(200).json({ message: "Code verified!" });
        } else {
            res.status(400).json({ message: "Invalid code!" });
        }
    });
});

app.post('/api/reset-password', async (req, res) => {
    const { username, newPassword } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        db.query("UPDATE admins SET password = ?, reset_code = NULL WHERE username = ?", [hashedPassword, username], (err) => {
            if (err) return res.status(500).json(err);
            res.status(200).json({ message: "Password reset successful!" });
        });
    } catch (error) {
        res.status(500).json({ message: "Server error during reset." });
    }
});

// --- ADMIN DASHBOARD ROUTES ---
app.get('/api/admin/profile', (req, res) => {
    const username = req.query.username || 'Mark_G'; 
    
    const sql = `
        SELECT a.fullname, a.username, a.email, a.signature, a.id_number, a.avatar,
               e.department, e.position, e.employment_status, e.employment_type
        FROM admins a
        LEFT JOIN employees e ON a.id_number = e.employee_id
        WHERE a.username = ?
    `;

    db.query(sql, [username], (err, adminRes) => {
        if (err) return res.status(500).json({ error: err.message });
        const profileData = adminRes.length > 0 ? adminRes[0] : {}; 
        
        db.query("SELECT * FROM admin_logs WHERE username = ? ORDER BY log_in DESC", [username], (err, logRes) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ profile: profileData, logs: logRes || [] });
        });
    });
});

app.post('/api/admin/avatar', (req, res) => {
    const { username, avatar } = req.body;
    db.query("UPDATE admins SET avatar = ? WHERE username = ?", [avatar, username], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Avatar updated successfully!" });
    });
});

app.post('/api/admin/change-password', async (req, res) => {
    const { username, currentPassword, newPassword } = req.body;
    
    db.query("SELECT password FROM admins WHERE username = ?", [username], async (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.length === 0) return res.status(404).json({ message: "User not found" });

        try {
            const match = await bcrypt.compare(currentPassword, result[0].password);
            if (!match) return res.status(400).json({ message: "Incorrect current password" });

            const hashedNew = await bcrypt.hash(newPassword, 10);
            db.query("UPDATE admins SET password = ? WHERE username = ?", [hashedNew, username], (err) => {
                if (err) return res.status(500).json(err);
                res.json({ message: "Password updated successfully!" });
            });
        } catch (error) {
            res.status(500).json({ message: "Server error during password change." });
        }
    });
});

app.post('/api/admin/signature', (req, res) => {
    const { username, signature } = req.body;
    db.query("UPDATE admins SET signature = ? WHERE username = ?", [signature, username], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Signature saved successfully!" });
    });
});

app.get('/api/clients/:type', (req, res) => {
    const type = req.params.type;
    let sql = "";

    if (type === 'student') {
        sql = `SELECT v.*, s.fullname as name, s.department, s.program 
               FROM clinic_visits v JOIN students s ON v.srcode = s.srcode 
               ORDER BY v.visit_date DESC, v.time_in DESC`;
    } else if (type === 'employee') {
        sql = `SELECT v.*, e.fullname as name, e.department, e.position, e.employment_status, e.employment_type 
               FROM employee_clinic_visit v JOIN employees e ON v.employee_id = e.employee_id 
               ORDER BY v.visit_date DESC, v.time_in DESC`;
    } else {
        sql = `SELECT *, fullname as name FROM visitor_logs ORDER BY visit_date DESC, time_in DESC`;
    }

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Client query error:", err.message);
            return res.status(200).json([]);
        }
        if (!results || !Array.isArray(results)) return res.status(200).json([]);

        const processedData = results.map(row => {
            let status = 'Completed';
            if (!row.time_out) {
                status = 'In-Clinic';
            } else {
                const isCert = row.purpose_med_cert || row.purpose_pre_enrolment || (row.purpose && row.purpose.includes('Certificate'));
                if (isCert && row.cert_status) {
                    status = row.cert_status;
                }
            }
            return { ...row, dynamic_status: status };
        });

        // FIXED: Fetch symptoms and medicines for each visit and attach them
        const visitIds = processedData.map(r => r.visit_id);
        if (visitIds.length === 0) return res.json([]);

        const userType = type === 'student' ? 'student' : type === 'employee' ? 'employee' : 'visitor';

        db.query(
            "SELECT * FROM recorded_symptoms WHERE visit_id IN (?) AND user_type = ?",
            [visitIds, userType],
            (err, sympResults) => {
                if (err) sympResults = [];

                db.query(
                    "SELECT * FROM dispensed_medicines WHERE visit_id IN (?) AND user_type = ?",
                    [visitIds, userType],
                    (err, medResults) => {
                        if (err) medResults = [];

                        const finalData = processedData.map(row => {
                            const symptoms = (sympResults || [])
                                .filter(s => s.visit_id === row.visit_id)
                                .map(s => s.symptom_name);
                            const medicines = (medResults || [])
                                .filter(m => m.visit_id === row.visit_id);
                            return { ...row, symptoms, medicines };
                        });

                        res.json(finalData);
                    }
                );
            }
        );
    });
});

app.put('/api/clients/:type/:id', (req, res) => {
    const { type, id } = req.params;
    const d = req.body;
 
    let sql = '';
    let params = [];
 
    if (type === 'student') {
        sql = `
            UPDATE clinic_visits SET
                blood_pressure          = ?,
                cert_status             = ?,
                remarks                 = ?,
                special_needs           = ?,
                pwd_type                = ?,
                purpose_medical_consult = ?,
                purpose_blood_pressure  = ?,
                purpose_dental          = ?,
                purpose_med_cert        = ?,
                purpose_pre_enrolment   = ?,
                dental_service_type     = ?,
                cert_type               = ?,
                purpose_others          = ?
            WHERE visit_id = ?
        `;
        params = [
            d.blood_pressure          || null,
            d.cert_status             || null,
            d.remarks                 || null,
            d.special_needs           || 'None',
            d.pwd_type                || 'N/A',
            d.purpose_medical_consult || 0,
            d.purpose_blood_pressure  || 0,
            d.purpose_dental          || 0,
            d.purpose_med_cert        || 0,
            d.purpose_pre_enrolment   || 0,
            d.dental_service_type     || null,
            d.cert_type               || null,   
            d.purpose_others          || null,
            id
        ];
 
    } else if (type === 'employee') {
        const purposeParts = [];
        if (d.purpose_medical_consult) purposeParts.push('Medical Consult/Medicine');
        if (d.purpose_blood_pressure)  purposeParts.push('Blood Pressure');
        if (d.purpose_dental)          purposeParts.push('Dental');
        if (d.purpose_med_cert)        purposeParts.push('Medical Certificate');
        if (d.purpose_pre_enrolment)   purposeParts.push('Pre-enrolment');
        if (d.others_specify)          purposeParts.push('Others');
        const purposeOfVisit = purposeParts.join(', ') || null;
 
        sql = `
            UPDATE employee_clinic_visit SET
                blood_pressure      = ?,
                cert_status         = ?,
                remarks             = ?,
                special_needs       = ?,
                pwd_type            = ?,
                purpose_of_visit    = ?,
                dental_service_type = ?,
                certificate_type    = ?,
                others_specify      = ?
            WHERE visit_id = ?
        `;
        params = [
            d.blood_pressure      || null,
            d.cert_status         || null,
            d.remarks             || null,
            d.special_needs       || 'None',
            d.pwd_type            || 'N/A',
            purposeOfVisit,
            d.dental_service_type || null,
            d.certificate_type    || null,   
            d.others_specify      || null,
            id
        ];
 
    } else {
        sql = `
            UPDATE visitor_logs SET
                blood_pressure = ?,
                cert_status    = ?,
                remarks        = ?,
                special_needs  = ?,
                pwd_type       = ?
            WHERE visit_id = ?
        `;
        params = [
            d.blood_pressure || null,
            d.cert_status    || null,
            d.remarks        || null,
            d.special_needs  || 'None',
            d.pwd_type       || 'N/A',
            id
        ];
    }
 
    db.query(sql, params, (err) => {
        if (err) {
            console.error("Update error:", err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "Record updated successfully!" });
    });
});

app.get('/api/export/:type', async (req, res) => {
    const type = req.params.type;
    if (!['student', 'employee', 'visitor'].includes(type)) {
        return res.status(400).json({ error: 'Invalid client type' });
    }

    const queryAsync = (sql, p) => new Promise((resolve, reject) => {
        db.query(sql, p || [], (err, r) => err ? reject(err) : resolve(r));
    });

    const formatDate = (d) => d ? new Date(d).toLocaleDateString() : 'N/A';
    const yesNo = (v) => v ? 'Yes' : 'No';
    const formatMedicines = (meds) => (meds || [])
        .map(m => `${m.medicine_generic || 'N/A'}${m.medicine_brand ? ` (${m.medicine_brand})` : ''} - Qty:${m.quantity_box || 0} Pcs:${m.pieces || 0}`)
        .join('; ');
    const getStatus = (row) => {
        if (!row.time_out) return 'In-Clinic';
        const isCert = row.purpose_med_cert || row.purpose_pre_enrolment || (row.purpose && String(row.purpose).includes('Certificate'));
        if (isCert && row.cert_status) return row.cert_status;
        return 'Completed';
    };

    try {
        let sql = '';
        if (type === 'student') {
            sql = `SELECT v.*, s.fullname as name, s.department, s.program
                   FROM clinic_visits v JOIN students s ON v.srcode = s.srcode
                   ORDER BY v.visit_date DESC, v.time_in DESC`;
        } else if (type === 'employee') {
            sql = `SELECT v.*, e.fullname as name, e.department, e.position, e.employment_type, e.employment_status
                   FROM employee_clinic_visit v JOIN employees e ON v.employee_id = e.employee_id
                   ORDER BY v.visit_date DESC, v.time_in DESC`;
        } else {
            sql = `SELECT *, fullname as name FROM visitor_logs ORDER BY visit_date DESC, time_in DESC`;
        }

        const rows = await queryAsync(sql);
        const visitIds = rows.map(r => r.visit_id);
        const userType = type === 'student' ? 'student' : type === 'employee' ? 'employee' : 'visitor';

        let sympResults = [];
        let medResults = [];
        if (visitIds.length > 0) {
            sympResults = await queryAsync(
                'SELECT * FROM recorded_symptoms WHERE visit_id IN (?) AND user_type = ?',
                [visitIds, userType]
            );
            medResults = await queryAsync(
                'SELECT * FROM dispensed_medicines WHERE visit_id IN (?) AND user_type = ?',
                [visitIds, userType]
            );
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(
            type === 'student' ? 'Students' : type === 'employee' ? 'Employees' : 'Visitors'
        );

        if (type === 'student') {
            worksheet.columns = [
                { header: 'Visit Date', key: 'visit_date', width: 14 },
                { header: 'SR Code', key: 'srcode', width: 14 },
                { header: 'Name', key: 'name', width: 28 },
                { header: 'Department', key: 'department', width: 16 },
                { header: 'Program', key: 'program', width: 22 },
                { header: 'Age', key: 'age', width: 8 },
                { header: 'Gender', key: 'gender', width: 14 },
                { header: 'Special Needs', key: 'special_needs', width: 14 },
                { header: 'Disability Type', key: 'pwd_type', width: 22 },
                { header: 'Time In', key: 'time_in', width: 12 },
                { header: 'Time Out', key: 'time_out', width: 12 },
                { header: 'Status', key: 'dynamic_status', width: 14 },
                { header: 'Blood Pressure', key: 'blood_pressure', width: 14 },
                { header: 'Medical Consult/Medicine', key: 'purpose_medical_consult', width: 22 },
                { header: 'Dental', key: 'purpose_dental', width: 10 },
                { header: 'Dental Service', key: 'dental_service_type', width: 22 },
                { header: 'Blood Pressure Visit', key: 'purpose_blood_pressure', width: 18 },
                { header: 'Medical Certificate', key: 'purpose_med_cert', width: 18 },
                { header: 'Certificate Type', key: 'cert_type', width: 22 },
                { header: 'Pre-enrolment', key: 'purpose_pre_enrolment', width: 14 },
                { header: 'Others', key: 'purpose_others', width: 20 },
                { header: 'Certificate Status', key: 'cert_status', width: 18 },
                { header: 'Is Confined', key: 'is_confined', width: 12 },
                { header: 'Consideration', key: 'consideration', width: 25 },
                { header: 'Remarks', key: 'remarks', width: 30 },
                { header: 'Symptoms', key: 'symptoms', width: 40 },
                { header: 'Medicines Dispensed', key: 'medicines', width: 50 },
                { header: 'Signature', key: 'signature', width: 18 },
            ];
        } else if (type === 'employee') {
            worksheet.columns = [
                { header: 'Visit Date', key: 'visit_date', width: 14 },
                { header: 'Employee ID', key: 'employee_id', width: 14 },
                { header: 'Name', key: 'name', width: 28 },
                { header: 'Department', key: 'department', width: 16 },
                { header: 'Position', key: 'position', width: 22 },
                { header: 'Employment Type', key: 'employment_type', width: 16 },
                { header: 'Employment Status', key: 'employment_status', width: 18 },
                { header: 'Age', key: 'age', width: 8 },
                { header: 'Gender', key: 'gender', width: 14 },
                { header: 'Special Needs', key: 'special_needs', width: 14 },
                { header: 'Disability Type', key: 'pwd_type', width: 22 },
                { header: 'Time In', key: 'time_in', width: 12 },
                { header: 'Time Out', key: 'time_out', width: 12 },
                { header: 'Status', key: 'dynamic_status', width: 14 },
                { header: 'Blood Pressure', key: 'blood_pressure', width: 14 },
                { header: 'Purpose of Visit', key: 'purpose_of_visit', width: 30 },
                { header: 'Dental Service', key: 'dental_service_type', width: 22 },
                { header: 'Certificate Type', key: 'certificate_type', width: 22 },
                { header: 'Others Specify', key: 'others_specify', width: 22 },
                { header: 'Certificate Status', key: 'cert_status', width: 18 },
                { header: 'Is Confined', key: 'is_confined', width: 12 },
                { header: 'Consideration', key: 'consideration', width: 25 },
                { header: 'Remarks', key: 'remarks', width: 30 },
                { header: 'Symptoms', key: 'symptoms', width: 40 },
                { header: 'Medicines Dispensed', key: 'medicines', width: 50 },
                { header: 'Signature', key: 'signature', width: 18 },
            ];
        } else {
            worksheet.columns = [
                { header: 'Visit Date', key: 'visit_date', width: 14 },
                { header: 'ID No.', key: 'idNo', width: 12 },
                { header: 'Name', key: 'name', width: 28 },
                { header: 'Birthday', key: 'birthday', width: 14 },
                { header: 'Age', key: 'age', width: 8 },
                { header: 'Gender', key: 'gender', width: 14 },
                { header: 'Special Needs', key: 'special_needs', width: 14 },
                { header: 'Disability Type', key: 'pwd_type', width: 22 },
                { header: 'Purpose', key: 'purpose', width: 25 },
                { header: 'Certificate Type', key: 'certificate_type', width: 22 },
                { header: 'Others Specify', key: 'others_specify', width: 22 },
                { header: 'Time In', key: 'time_in', width: 12 },
                { header: 'Time Out', key: 'time_out', width: 12 },
                { header: 'Status', key: 'dynamic_status', width: 14 },
                { header: 'Blood Pressure', key: 'blood_pressure', width: 14 },
                { header: 'Certificate Status', key: 'cert_status', width: 18 },
                { header: 'Is Confined', key: 'is_confined', width: 12 },
                { header: 'Consideration', key: 'consideration', width: 25 },
                { header: 'Remarks', key: 'remarks', width: 30 },
                { header: 'Symptoms', key: 'symptoms', width: 40 },
                { header: 'Medicines Dispensed', key: 'medicines', width: 50 },
                { header: 'Signature', key: 'signature', width: 18 },
            ];
        }

        worksheet.getRow(1).font = { bold: true };

        rows.forEach(r => {
            const symptoms = sympResults
                .filter(s => s.visit_id === r.visit_id)
                .map(s => s.symptom_name)
                .join(', ');
            const medicines = formatMedicines(
                medResults.filter(m => m.visit_id === r.visit_id)
            );

            const base = {
                ...r,
                visit_date: formatDate(r.visit_date),
                birthday: r.birthday ? formatDate(r.birthday) : (r.birthday || 'N/A'),
                dynamic_status: getStatus(r),
                symptoms: symptoms || 'N/A',
                medicines: medicines || 'N/A',
                signature: r.signature ? 'On file' : 'No signature',
            };

            if (type === 'student') {
                worksheet.addRow({
                    ...base,
                    purpose_medical_consult: yesNo(r.purpose_medical_consult),
                    purpose_dental: yesNo(r.purpose_dental),
                    purpose_blood_pressure: yesNo(r.purpose_blood_pressure),
                    purpose_med_cert: yesNo(r.purpose_med_cert),
                    purpose_pre_enrolment: yesNo(r.purpose_pre_enrolment),
                });
            } else {
                worksheet.addRow(base);
            }
        });

        const sheetLabel = type === 'student' ? 'Students' : type === 'employee' ? 'Employees' : 'Visitors';
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="BSU_${sheetLabel}_Records.xlsx"`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error('Client export error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/export-single/:type/:id', async (req, res) => {
    const { type, id } = req.params;
    let sql = "";

    if (type === 'student') {
        sql = `SELECT v.*, s.fullname as name, s.department, s.program 
               FROM clinic_visits v JOIN students s ON v.srcode = s.srcode 
               WHERE v.visit_id = ?`;
    } else if (type === 'employee') {
        sql = `SELECT v.*, e.fullname as name, e.department, e.position, e.employment_status, e.employment_type 
               FROM employee_clinic_visit v JOIN employees e ON v.employee_id = e.employee_id 
               WHERE v.visit_id = ?`;
    } else {
        sql = `SELECT *, fullname as name FROM visitor_logs WHERE visit_id = ?`;
    }

    db.query(sql, [id], async (err, results) => {
        if (err || results.length === 0) return res.status(500).json({ error: 'Record not found' });

        const r = results[0];
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Visit Record');

        worksheet.columns = [
            { header: 'Field', key: 'field', width: 25 },
            { header: 'Value', key: 'value', width: 40 }
        ];
        worksheet.getRow(1).font = { bold: true };

        const idVal = r.srcode || r.employee_id || r.idNo || 'N/A';

        let purposes = [];
        if (r.purpose_medical_consult) purposes.push('Medical Consult/Medicine');
        if (r.purpose_dental) purposes.push('Dental');
        if (r.purpose_blood_pressure) purposes.push('Blood Pressure');
        if (r.purpose_med_cert) purposes.push('Medical Certificate');
        if (r.purpose_pre_enrolment) purposes.push('Pre-enrolment');
        if (r.purpose) purposes.push(r.purpose);

        const rows = [
            { field: 'Name', value: r.name || r.fullname || 'N/A' },
            { field: 'ID / SR-Code', value: idVal },
            { field: 'Department', value: r.department || 'N/A' },
            { field: 'Program', value: r.program || 'N/A' },
            { field: 'Position', value: r.position || 'N/A' },
            { field: 'Employment Status', value: r.employment_status || 'N/A' },
            { field: 'Employment Type', value: r.employment_type || 'N/A' },
            { field: 'Date of Visit', value: r.visit_date ? new Date(r.visit_date).toLocaleDateString() : 'N/A' },
            { field: 'Time In', value: r.time_in || 'N/A' },
            { field: 'Time Out', value: r.time_out || 'N/A' },
            { field: 'Age', value: r.age != null ? String(r.age) : 'N/A' },
            { field: 'Gender', value: r.gender || 'N/A' },
            { field: 'Special Needs', value: r.special_needs || 'None' },
            { field: 'Purpose of Visit', value: purposes.length > 0 ? purposes.join(', ') : 'N/A' },
            { field: 'Blood Pressure', value: r.blood_pressure || 'N/A' },
            { field: 'Marked as Confined', value: r.is_confined || 'No' },
            { field: 'Certificate Status', value: r.cert_status || 'N/A' },
            { field: 'Remarks', value: r.remarks || 'N/A' },
            { field: 'Signature', value: r.signature ? '[Signature on file - see system]' : 'No signature on file' },
        ];

        worksheet.addRows(rows);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="visit_record_${idVal}.xlsx"`);
        await workbook.xlsx.write(res);
        res.end();
    });
});

// ==========================================
// INVENTORY API ROUTES
// ==========================================

app.get('/api/inventory', (req, res) => {
    db.query("SELECT * FROM master_medicines ORDER BY generic_name ASC", (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results || []);
    });
});

app.post('/api/inventory', (req, res) => {
    const { generic_name, brand_name, quantity, pieces, expiration_date } = req.body;
    
    db.query("INSERT INTO master_medicines (generic_name, brand_name, quantity, pieces, expiration_date) VALUES (?, ?, ?, ?, ?)", 
    [generic_name, brand_name, quantity || 0, pieces || 0, expiration_date || null], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Medicine added successfully" });
    });
});

app.put('/api/inventory/:id', (req, res) => {
    const { generic_name, brand_name, quantity, pieces, expiration_date } = req.body;
    
    db.query("UPDATE master_medicines SET generic_name=?, brand_name=?, quantity=?, pieces=?, expiration_date=? WHERE med_id=?", 
    [generic_name, brand_name, quantity || 0, pieces || 0, expiration_date || null, req.params.id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Medicine updated successfully" });
    });
});

app.get('/api/export-inventory', async (req, res) => {
    const queryAsync = (sql, p) => new Promise((resolve, reject) => {
        db.query(sql, p || [], (err, r) => err ? reject(err) : resolve(r));
    });

    try {
        const medicines = await queryAsync("SELECT * FROM master_medicines ORDER BY generic_name ASC");
        const dispensed = await queryAsync(
            `SELECT dm.medicine_generic, dm.medicine_brand, 
                    SUM(COALESCE(dm.quantity_box, 0)) as total_qty_dispensed,
                    SUM(COALESCE(dm.pieces, 0)) as total_pcs_dispensed
             FROM dispensed_medicines dm
             GROUP BY dm.medicine_generic, dm.medicine_brand`
        );

        const workbook = new ExcelJS.Workbook();

        // ── Sheet 1: Current Inventory ─────────────────────────
        const ws1 = workbook.addWorksheet('Current Inventory');
        ws1.columns = [
            { header: 'No.',             key: 'index',           width: 8  },
            { header: 'Generic Name',    key: 'generic_name',    width: 25 },
            { header: 'Brand Name',      key: 'brand_name',      width: 25 },
            { header: 'Qty (Box)',        key: 'quantity',        width: 14 },
            { header: 'Pieces',          key: 'pieces',          width: 12 },
            { header: 'Expiration Date', key: 'expiration_date', width: 18 },
            { header: 'Status',          key: 'status',          width: 14 },
        ];
        ws1.getRow(1).font = { bold: true };

        medicines.forEach((row, i) => {
            let status = 'Good';
            if (row.expiration_date && new Date(row.expiration_date) < new Date()) status = 'Expired';
            else if (row.quantity <= 2) status = 'Low Stock';
            ws1.addRow({
                index: i + 1,
                generic_name: row.generic_name,
                brand_name: row.brand_name || 'N/A',
                quantity: row.quantity || 0,
                pieces: row.pieces || 0,
                expiration_date: row.expiration_date ? new Date(row.expiration_date).toLocaleDateString() : 'N/A',
                status
            });
        });

        // ── Sheet 2: Original vs Current Stock ─────────────────
        const ws2 = workbook.addWorksheet('Stock Tracking');
        ws2.columns = [
            { header: 'No.',                   key: 'index',            width: 8  },
            { header: 'Generic Name',          key: 'generic_name',     width: 25 },
            { header: 'Brand Name',            key: 'brand_name',       width: 25 },
            { header: 'Current Qty (Box)',      key: 'current_qty',      width: 16 },
            { header: 'Current Pieces',        key: 'current_pcs',      width: 14 },
            { header: 'Total Qty Dispensed',   key: 'dispensed_qty',    width: 18 },
            { header: 'Total Pcs Dispensed',   key: 'dispensed_pcs',    width: 18 },
            { header: 'Original Qty (Box)',     key: 'original_qty',     width: 16 },
            { header: 'Original Pieces',       key: 'original_pcs',     width: 14 },
            { header: 'Expiration Date',       key: 'expiration_date',  width: 18 },
            { header: 'Status',                key: 'status',           width: 14 },
        ];
        ws2.getRow(1).font = { bold: true };

        // Style header row green
        ws2.getRow(1).eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF50C878' } };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        });

        medicines.forEach((row, i) => {
            const dispMatch = dispensed.find(d =>
                (d.medicine_generic || '').toLowerCase() === (row.generic_name || '').toLowerCase()
            );
            const dispensedQty = dispMatch ? parseInt(dispMatch.total_qty_dispensed) || 0 : 0;
            const dispensedPcs = dispMatch ? parseInt(dispMatch.total_pcs_dispensed) || 0 : 0;
            const originalQty  = (parseInt(row.quantity) || 0) + dispensedQty;
            const originalPcs  = (parseInt(row.pieces)   || 0) + dispensedPcs;

            let status = 'Good';
            if (row.expiration_date && new Date(row.expiration_date) < new Date()) status = 'Expired';
            else if (row.quantity <= 2) status = 'Low Stock';

            const dataRow = ws2.addRow({
                index: i + 1,
                generic_name:    row.generic_name,
                brand_name:      row.brand_name || 'N/A',
                current_qty:     row.quantity   || 0,
                current_pcs:     row.pieces     || 0,
                dispensed_qty:   dispensedQty,
                dispensed_pcs:   dispensedPcs,
                original_qty:    originalQty,
                original_pcs:    originalPcs,
                expiration_date: row.expiration_date ? new Date(row.expiration_date).toLocaleDateString() : 'N/A',
                status
            });

            // Highlight rows where stock was used
            if (dispensedQty > 0 || dispensedPcs > 0) {
                dataRow.getCell('dispensed_qty').font = { color: { argb: 'FFEF4444' }, bold: true };
                dataRow.getCell('dispensed_pcs').font = { color: { argb: 'FFEF4444' }, bold: true };
                dataRow.getCell('original_qty').font  = { color: { argb: 'FF1D4ED8' }, bold: true };
                dataRow.getCell('original_pcs').font  = { color: { argb: 'FF1D4ED8' }, bold: true };
            }
        });

        // ── Sheet 3: Dispensing History ────────────────────────
        const history = await queryAsync(
            `SELECT dm.*, 
                    COALESCE(cv.srcode, ecv.employee_id, vl.idNo) as client_id,
                    COALESCE(s.fullname, e.fullname, vl.fullname) as client_name,
                    COALESCE(cv.visit_date, ecv.visit_date, vl.visit_date) as visit_date
             FROM dispensed_medicines dm
             LEFT JOIN clinic_visits cv ON dm.visit_id = cv.visit_id AND dm.user_type = 'student'
             LEFT JOIN students s ON cv.srcode = s.srcode
             LEFT JOIN employee_clinic_visit ecv ON dm.visit_id = ecv.visit_id AND dm.user_type = 'employee'
             LEFT JOIN employees e ON ecv.employee_id = e.employee_id
             LEFT JOIN visitor_logs vl ON dm.visit_id = vl.visit_id AND dm.user_type = 'visitor'
             ORDER BY dm.visit_id DESC`
        );

        const ws3 = workbook.addWorksheet('Dispensing History');
        ws3.columns = [
            { header: 'No.',             key: 'index',            width: 8  },
            { header: 'Visit Date',      key: 'visit_date',       width: 14 },
            { header: 'Client Type',     key: 'user_type',        width: 14 },
            { header: 'Client ID',       key: 'client_id',        width: 16 },
            { header: 'Client Name',     key: 'client_name',      width: 28 },
            { header: 'Generic Name',    key: 'medicine_generic', width: 25 },
            { header: 'Brand Name',      key: 'medicine_brand',   width: 25 },
            { header: 'Qty Dispensed',   key: 'quantity_box',     width: 14 },
            { header: 'Pcs Dispensed',   key: 'pieces',           width: 14 },
        ];
        ws3.getRow(1).font = { bold: true };
        ws3.getRow(1).eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCC00' } };
            cell.font = { bold: true, color: { argb: 'FF111111' } };
        });

        (history || []).forEach((row, i) => {
            ws3.addRow({
                index: i + 1,
                visit_date:       row.visit_date ? new Date(row.visit_date).toLocaleDateString() : 'N/A',
                user_type:        row.user_type,
                client_id:        row.client_id   || 'N/A',
                client_name:      row.client_name || 'N/A',
                medicine_generic: row.medicine_generic,
                medicine_brand:   row.medicine_brand || 'N/A',
                quantity_box:     row.quantity_box || 0,
                pieces:           row.pieces       || 0,
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="BSU_Inventory_Records.xlsx"`);
        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error("Inventory export error:", err);
        res.status(500).json({ error: err.message });
    }
});

// NEW: Delete multiple medicines by ID
app.delete('/api/inventory/delete-multiple', (req, res) => {
    const { ids } = req.body;
    if (!ids || ids.length === 0) return res.status(400).json({ message: "No IDs provided" });

    db.query("DELETE FROM master_medicines WHERE med_id IN (?)", [ids], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Medicines deleted successfully" });
    });
});

// REPORT EXPORT — full client details + symptoms + medicines + embedded pie charts
app.get('/api/export-report', async (req, res) => {
    const { from, to } = req.query;

    let dateFilter = '';
    const params = [];
    if (from && from !== 'all') { dateFilter += ' AND visit_date >= ?'; params.push(from); }
    if (to   && to   !== 'all') { dateFilter += ' AND visit_date <= ?'; params.push(to);   }

    const queryAsync = (sql, p) => new Promise((resolve, reject) => {
        db.query(sql, p, (err, r) => err ? reject(err) : resolve(r));
    });

    // ── Chart generator helper ──────────────────────────────────
    async function generatePieChartBuffer(title, counts) {
        const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
        const labels = Object.keys(counts);
        const values = Object.values(counts);
        const total  = values.reduce((a, b) => a + b, 0);
        if (total === 0) return null;

        const COLORS = ['#50C878','#FFCC00','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899','#14b8a6'];

        const canvas = new ChartJSNodeCanvas({ width: 500, height: 380, backgroundColour: 'white' });
        const buffer = await canvas.renderToBuffer({
            type: 'pie',
            data: {
                labels: labels.map((l, i) => `${l} (${total > 0 ? ((values[i]/total)*100).toFixed(1) : 0}%)`),
                datasets: [{
                    data: values,
                    backgroundColor: COLORS.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: false,
                plugins: {
                    title: {
                        display: true,
                        text: title,
                        font: { size: 16, weight: 'bold' },
                        padding: { bottom: 16 }
                    },
                    legend: {
                        position: 'bottom',
                        labels: { font: { size: 11 }, padding: 12 }
                    }
                }
            }
        });
        return buffer;
    }

    try {
        const workbook = new ExcelJS.Workbook();

        // ── Sheet 1: Students ──────────────────────────────────
        const sRows = await queryAsync(
            `SELECT v.*, s.fullname as name, s.department, s.program 
             FROM clinic_visits v JOIN students s ON v.srcode = s.srcode 
             WHERE 1=1 ${dateFilter} ORDER BY v.visit_date DESC, v.time_in DESC`,
            params
        );
        const sIds = sRows.map(r => r.visit_id);
        let sSymps = [], sMeds = [];
        if (sIds.length > 0) {
            sSymps = await queryAsync("SELECT * FROM recorded_symptoms WHERE visit_id IN (?) AND user_type='student'", [sIds]);
            sMeds  = await queryAsync("SELECT * FROM dispensed_medicines WHERE visit_id IN (?) AND user_type='student'", [sIds]);
        }

        const ws1 = workbook.addWorksheet('Students');
        ws1.columns = [
            { header: 'Visit Date',           key: 'visit_date',              width: 14 },
            { header: 'SR Code',              key: 'srcode',                  width: 14 },
            { header: 'Name',                 key: 'name',                    width: 28 },
            { header: 'Department',           key: 'department',              width: 16 },
            { header: 'Program',              key: 'program',                 width: 22 },
            { header: 'Age',                  key: 'age',                     width: 8  },
            { header: 'Gender',               key: 'gender',                  width: 14 },
            { header: 'Special Needs',        key: 'special_needs',           width: 14 },
            { header: 'Disability Type',      key: 'pwd_type',                width: 22 },
            { header: 'Time In',              key: 'time_in',                 width: 12 },
            { header: 'Time Out',             key: 'time_out',                width: 12 },
            { header: 'Blood Pressure',       key: 'blood_pressure',          width: 14 },
            { header: 'Medical Consult',      key: 'purpose_medical_consult', width: 16 },
            { header: 'Dental',               key: 'purpose_dental',          width: 10 },
            { header: 'Dental Service',       key: 'dental_service_type',     width: 22 },
            { header: 'Blood Pressure Visit', key: 'purpose_blood_pressure',  width: 18 },
            { header: 'Med Certificate',      key: 'purpose_med_cert',        width: 16 },
            { header: 'Cert Type',            key: 'cert_type',               width: 22 },
            { header: 'Pre-enrolment',        key: 'purpose_pre_enrolment',   width: 14 },
            { header: 'Others',               key: 'purpose_others',          width: 20 },
            { header: 'Certificate Status',   key: 'cert_status',             width: 18 },
            { header: 'Is Confined',          key: 'is_confined',             width: 12 },
            { header: 'Consideration',        key: 'consideration',           width: 25 },
            { header: 'Remarks',              key: 'remarks',                 width: 30 },
            { header: 'Symptoms',             key: 'symptoms',                width: 40 },
            { header: 'Medicines Dispensed',  key: 'medicines',               width: 50 },
        ];
        ws1.getRow(1).font = { bold: true };
        sRows.forEach(r => {
            const symptoms = sSymps.filter(s => s.visit_id === r.visit_id).map(s => s.symptom_name).join(', ');
            const medicines = sMeds.filter(m => m.visit_id === r.visit_id)
                .map(m => `${m.medicine_generic}${m.medicine_brand ? ' ('+m.medicine_brand+')' : ''} - Qty:${m.quantity_box||0} Pcs:${m.pieces||0}`)
                .join('; ');
            ws1.addRow({
                ...r,
                visit_date: r.visit_date ? new Date(r.visit_date).toLocaleDateString() : 'N/A',
                purpose_medical_consult: r.purpose_medical_consult ? 'Yes' : 'No',
                purpose_dental:          r.purpose_dental          ? 'Yes' : 'No',
                purpose_blood_pressure:  r.purpose_blood_pressure  ? 'Yes' : 'No',
                purpose_med_cert:        r.purpose_med_cert        ? 'Yes' : 'No',
                purpose_pre_enrolment:   r.purpose_pre_enrolment   ? 'Yes' : 'No',
                symptoms, medicines
            });
        });

        // ── Sheet 2: Employees ─────────────────────────────────
        const eRows = await queryAsync(
            `SELECT v.*, e.fullname as name, e.department, e.position, e.employment_type, e.employment_status
             FROM employee_clinic_visit v JOIN employees e ON v.employee_id = e.employee_id
             WHERE 1=1 ${dateFilter} ORDER BY v.visit_date DESC, v.time_in DESC`,
            params
        );
        const eIds = eRows.map(r => r.visit_id);
        let eSymps = [], eMeds = [];
        if (eIds.length > 0) {
            eSymps = await queryAsync("SELECT * FROM recorded_symptoms WHERE visit_id IN (?) AND user_type='employee'", [eIds]);
            eMeds  = await queryAsync("SELECT * FROM dispensed_medicines WHERE visit_id IN (?) AND user_type='employee'", [eIds]);
        }
        const ws2 = workbook.addWorksheet('Employees');
        ws2.columns = [
            { header: 'Visit Date',          key: 'visit_date',          width: 14 },
            { header: 'Employee ID',         key: 'employee_id',         width: 14 },
            { header: 'Name',                key: 'name',                width: 28 },
            { header: 'Department',          key: 'department',          width: 16 },
            { header: 'Position',            key: 'position',            width: 22 },
            { header: 'Employment Type',     key: 'employment_type',     width: 16 },
            { header: 'Employment Status',   key: 'employment_status',   width: 18 },
            { header: 'Age',                 key: 'age',                 width: 8  },
            { header: 'Gender',              key: 'gender',              width: 14 },
            { header: 'Special Needs',       key: 'special_needs',       width: 14 },
            { header: 'Disability Type',     key: 'pwd_type',            width: 22 },
            { header: 'Time In',             key: 'time_in',             width: 12 },
            { header: 'Time Out',            key: 'time_out',            width: 12 },
            { header: 'Blood Pressure',      key: 'blood_pressure',      width: 14 },
            { header: 'Purpose of Visit',    key: 'purpose_of_visit',    width: 30 },
            { header: 'Dental Service',      key: 'dental_service_type', width: 22 },
            { header: 'Certificate Type',    key: 'certificate_type',    width: 22 },
            { header: 'Others Specify',      key: 'others_specify',      width: 22 },
            { header: 'Certificate Status',  key: 'cert_status',         width: 18 },
            { header: 'Is Confined',         key: 'is_confined',         width: 12 },
            { header: 'Consideration',       key: 'consideration',       width: 25 },
            { header: 'Remarks',             key: 'remarks',             width: 30 },
            { header: 'Symptoms',            key: 'symptoms',            width: 40 },
            { header: 'Medicines Dispensed', key: 'medicines',           width: 50 },
        ];
        ws2.getRow(1).font = { bold: true };
        eRows.forEach(r => {
            const symptoms = eSymps.filter(s => s.visit_id === r.visit_id).map(s => s.symptom_name).join(', ');
            const medicines = eMeds.filter(m => m.visit_id === r.visit_id)
                .map(m => `${m.medicine_generic}${m.medicine_brand ? ' ('+m.medicine_brand+')' : ''} - Qty:${m.quantity_box||0} Pcs:${m.pieces||0}`)
                .join('; ');
            ws2.addRow({ ...r, visit_date: r.visit_date ? new Date(r.visit_date).toLocaleDateString() : 'N/A', symptoms, medicines });
        });

        // ── Sheet 3: Visitors ──────────────────────────────────
        const vRows = await queryAsync(
            `SELECT * FROM visitor_logs WHERE 1=1 ${dateFilter} ORDER BY visit_date DESC, time_in DESC`,
            params
        );
        const vIds = vRows.map(r => r.visit_id);
        let vSymps = [], vMeds = [];
        if (vIds.length > 0) {
            vSymps = await queryAsync("SELECT * FROM recorded_symptoms WHERE visit_id IN (?) AND user_type='visitor'", [vIds]);
            vMeds  = await queryAsync("SELECT * FROM dispensed_medicines WHERE visit_id IN (?) AND user_type='visitor'", [vIds]);
        }
        const ws3 = workbook.addWorksheet('Visitors');
        ws3.columns = [
            { header: 'Visit Date',          key: 'visit_date',       width: 14 },
            { header: 'ID No.',              key: 'idNo',             width: 12 },
            { header: 'Name',                key: 'fullname',         width: 28 },
            { header: 'Birthday',            key: 'birthday',         width: 14 },
            { header: 'Age',                 key: 'age',              width: 8  },
            { header: 'Gender',              key: 'gender',           width: 14 },
            { header: 'Special Needs',       key: 'special_needs',    width: 14 },
            { header: 'Disability Type',     key: 'pwd_type',         width: 22 },
            { header: 'Purpose',             key: 'purpose',          width: 25 },
            { header: 'Certificate Type',    key: 'certificate_type', width: 22 },
            { header: 'Others Specify',      key: 'others_specify',   width: 22 },
            { header: 'Time In',             key: 'time_in',          width: 12 },
            { header: 'Time Out',            key: 'time_out',         width: 12 },
            { header: 'Blood Pressure',      key: 'blood_pressure',   width: 14 },
            { header: 'Certificate Status',  key: 'cert_status',      width: 18 },
            { header: 'Is Confined',         key: 'is_confined',      width: 12 },
            { header: 'Consideration',       key: 'consideration',    width: 25 },
            { header: 'Remarks',             key: 'remarks',          width: 30 },
            { header: 'Symptoms',            key: 'symptoms',         width: 40 },
            { header: 'Medicines Dispensed', key: 'medicines',        width: 50 },
        ];
        ws3.getRow(1).font = { bold: true };
        vRows.forEach(r => {
            const symptoms = vSymps.filter(s => s.visit_id === r.visit_id).map(s => s.symptom_name).join(', ');
            const medicines = vMeds.filter(m => m.visit_id === r.visit_id)
                .map(m => `${m.medicine_generic}${m.medicine_brand ? ' ('+m.medicine_brand+')' : ''} - Qty:${m.quantity_box||0} Pcs:${m.pieces||0}`)
                .join('; ');
            ws3.addRow({ ...r, visit_date: r.visit_date ? new Date(r.visit_date).toLocaleDateString() : 'N/A', symptoms, medicines });
        });

        // ── Build counts for charts & summary ──────────────────
        const allRows = [
            ...sRows.map(r => ({ ...r, clientType: 'Student' })),
            ...eRows.map(r => ({ ...r, clientType: 'Employee' })),
            ...vRows.map(r => ({ ...r, clientType: 'Visitor' }))
        ];
        const allMeds = [...sMeds, ...eMeds, ...vMeds];
        const visitIdsWithMeds = new Set(allMeds.map(m => m.visit_id));

        const genderCounts = {};
        const clientTypeCounts = { Student: 0, Employee: 0, Visitor: 0 };
        const purposeCounts = {};
        const medicineCounts = {};
        const addCount = (map, key, amt = 1) => {
            const k = (key || 'Unknown').toString().trim() || 'Unknown';
            map[k] = (map[k] || 0) + amt;
        };
        allRows.forEach(r => {
            addCount(genderCounts, r.gender || 'Unknown');
            addCount(clientTypeCounts, r.clientType);
            if (r.clientType === 'Student') {
                if (r.purpose_medical_consult) addCount(purposeCounts, 'Medical Consult');
                if (r.purpose_dental)          addCount(purposeCounts, 'Dental');
                if (r.purpose_blood_pressure)  addCount(purposeCounts, 'Blood Pressure');
                if (r.purpose_med_cert)        addCount(purposeCounts, 'Medical Certificate');
                if (r.purpose_pre_enrolment)   addCount(purposeCounts, 'Pre-enrolment');
                if (r.purpose_others)          addCount(purposeCounts, 'Others');
            } else if (r.clientType === 'Employee') {
                (r.purpose_of_visit || '').split(',').map(p => p.trim()).filter(Boolean).forEach(p => addCount(purposeCounts, p));
            } else {
                addCount(purposeCounts, r.purpose || 'Unknown');
            }
        });
        allMeds.forEach(m => {
            addCount(medicineCounts, m.medicine_generic || m.medicine_brand || 'Unknown', parseInt(m.quantity_box, 10) || 1);
        });

        // ── Sheet 4: Report Numbers ────────────────────────────
        const ws4 = workbook.addWorksheet('Report Numbers');
        ws4.columns = [
            { header: 'Metric', key: 'metric', width: 34 },
            { header: 'Value',  key: 'value',  width: 20 }
        ];
        ws4.getRow(1).font = { bold: true };
        ws4.addRows([
            { metric: 'Period From',                    value: from || 'All time' },
            { metric: 'Period To',                      value: to   || 'All time' },
            { metric: 'Total Visits',                   value: allRows.length },
            { metric: 'Active In-Clinic',               value: allRows.filter(r => !r.time_out).length },
            { metric: 'Timed Out (Completed)',          value: allRows.filter(r => !!r.time_out).length },
            { metric: 'Confined Cases',                 value: allRows.filter(r => String(r.is_confined||'').toLowerCase()==='yes').length },
            { metric: 'Visits with Medicine Dispensed', value: allRows.filter(r => visitIdsWithMeds.has(r.visit_id)).length },
            { metric: 'Student Visits',                 value: clientTypeCounts.Student  || 0 },
            { metric: 'Employee Visits',                value: clientTypeCounts.Employee || 0 },
            { metric: 'Visitor Visits',                 value: clientTypeCounts.Visitor  || 0 },
            { metric: 'Male',                           value: genderCounts.Male || 0 },
            { metric: 'Female',                         value: genderCounts.Female || 0 },
            { metric: 'Prefer not to say',              value: genderCounts['Prefer not to say'] || 0 },
            { metric: 'Others (Gender)',                value: genderCounts.Others || 0 },
            { metric: 'Unknown (Gender)',               value: genderCounts.Unknown || 0 },
        ]);

        // ── Sheet 5: Pie Charts (embedded PNG images) ──────────
        const wsCharts = workbook.addWorksheet('Pie Charts');
        wsCharts.getCell('A1').value = `BSU Health Services — Report Charts (${from || 'All'} to ${to || 'All'})`;
        wsCharts.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF16a34a' } };

        const chartDefs = [
            { title: 'Gender Distribution',    counts: genderCounts,     row: 3,  col: 1 },
            { title: 'Client Type',            counts: clientTypeCounts,  row: 3,  col: 10 },
            { title: 'Purpose of Visit',       counts: purposeCounts,     row: 23, col: 1 },
            { title: 'Medicines Dispensed',    counts: medicineCounts,    row: 23, col: 10 },
        ];

        for (const def of chartDefs) {
            const buf = await generatePieChartBuffer(def.title, def.counts);
            if (!buf) {
                // No data — write a note instead
                wsCharts.getCell(def.row, def.col).value = `${def.title}: No data for this period.`;
                wsCharts.getCell(def.row, def.col).font = { italic: true, color: { argb: 'FF9ca3af' } };
                continue;
            }
            const imageId = workbook.addImage({ buffer: buf, extension: 'png' });
            wsCharts.addImage(imageId, {
                tl: { col: def.col - 1, row: def.row - 1 },
                ext: { width: 480, height: 360 }
            });
        }

        // Set column widths so charts display nicely
        for (let i = 1; i <= 19; i++) wsCharts.getColumn(i).width = 9;

        // ── Sheet 6: Pie Chart Raw Data ────────────────────────
        const ws6 = workbook.addWorksheet('Chart Data');
        ws6.getCell('A1').value = 'Raw data used to generate the pie charts above.';
        ws6.getCell('A1').font = { italic: true, color: { argb: 'FF6B7280' } };

        const writeCategoryTable = (title, startRow, counts) => {
            ws6.getCell(`A${startRow}`).value = title;
            ws6.getCell(`A${startRow}`).font = { bold: true };
            ws6.getCell(`A${startRow + 1}`).value = 'Category';
            ws6.getCell(`B${startRow + 1}`).value = 'Count';
            ws6.getRow(startRow + 1).font = { bold: true };
            const entries = Object.entries(counts).filter(([, v]) => v > 0);
            entries.forEach(([k, v], idx) => {
                ws6.getCell(`A${startRow + 2 + idx}`).value = k;
                ws6.getCell(`B${startRow + 2 + idx}`).value = v;
            });
            return startRow + 4 + entries.length;
        };
        let rowPtr = 3;
        rowPtr = writeCategoryTable('Gender Distribution',          rowPtr, genderCounts);
        rowPtr = writeCategoryTable('Client Type Distribution',     rowPtr, clientTypeCounts);
        rowPtr = writeCategoryTable('Purpose of Visit Distribution',rowPtr, purposeCounts);
        writeCategoryTable('Medicines Dispensed Distribution',      rowPtr, medicineCounts);

        const filename = `BSU_Report_${from || 'all'}_to_${to || 'all'}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error("Report export error:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- DATABASE BACKUP ROUTE ---
app.get('/api/admin/backup-database', (req, res) => {
    const { exec } = require('child_process');

    const host     = process.env.DB_HOST     || 'localhost';
    const user     = process.env.DB_USER     || 'root';
    const password = process.env.DB_PASSWORD || '';
    const database = process.env.DB_NAME     || 'bsu_clinic';

    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
    const filename = `BSU_Clinic_Backup_${timestamp}.sql`;

    // Use full XAMPP path — works even without PATH environment variable
    const mysqldumpPath = `"C:\\xampp\\mysql\\bin\\mysqldump"`;

    // Build password argument — omit -p flag entirely if password is empty
    const passArg = password ? `-p"${password}"` : '';
    const cmd = `${mysqldumpPath} -h ${host} -u ${user} ${passArg} --single-transaction --routines --triggers --add-drop-table ${database}`;

    exec(cmd, { maxBuffer: 1024 * 1024 * 50 }, (err, stdout, stderr) => {
        if (err) {
            console.error('Backup error:', err.message);
            console.error('Stderr:', stderr);
            return res.status(500).json({ 
                error: 'Backup failed. Make sure mysqldump is installed and accessible.', 
                detail: err.message 
            });
        }

        if (!stdout || stdout.trim().length === 0) {
            return res.status(500).json({ error: 'Backup produced empty output. Check database name and credentials.' });
        }

        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(stdout);
    });
});

// --- SERVER START & AUTO-OPEN ---
app.listen(PORT, '0.0.0.0', () => {
    const url = `http://localhost:${PORT}`;
    console.log(`Clinic System running at ${url}`);
    exec(`start ${url}`, (err) => {
        if (err) console.error("Could not auto-open browser:", err);
    });
});