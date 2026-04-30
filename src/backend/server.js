const express = require('express');
const path = require('path');
const { exec } = require('child_process'); 
const db = require('./db'); 
const bcrypt = require('bcrypt');
const ExcelJS = require('exceljs');
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
    db.query("SELECT * FROM admins WHERE username = ?", [username], (err, result) => {
        if (err) return res.status(500).json(err);
        
        if (result.length > 0) {
            const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

            db.query("UPDATE admins SET reset_code = ? WHERE username = ?", [resetCode, username], (updateErr) => {
                if (updateErr) return res.status(500).json(updateErr);

                console.log(`\n=================================================`);
                console.log(`🚨 PASSWORD RESET REQUESTED 🚨`);
                console.log(`Admin Username: ${username}`);
                console.log(`Use this 6-Digit Code in the app: ${resetCode}`);
                console.log(`=================================================\n`);

                res.status(200).json({ message: "Code generated! Check the terminal." });
            });
        } else {
            res.status(404).json({ message: "Username not found" });
        }
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
    let sql = "";
    
    if (type === 'student') {
        sql = `SELECT v.visit_date, v.srcode, s.fullname, v.time_in, v.time_out, v.blood_pressure, v.remarks FROM clinic_visits v JOIN students s ON v.srcode = s.srcode`;
    } else if (type === 'employee') {
        sql = `SELECT v.visit_date, v.employee_id, e.fullname, v.time_in, v.time_out, v.blood_pressure, v.remarks FROM employee_clinic_visit v JOIN employees e ON v.employee_id = e.employee_id`;
    } else {
        sql = `SELECT visit_date, idNo, fullname, time_in, time_out, purpose, blood_pressure, remarks FROM visitor_logs`;
    }

    db.query(sql, async (err, results) => {
        if (err) return res.status(500).json(err);
        
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Records');

        if (type === 'student') {
            worksheet.columns = [
                { header: 'Visit Date', key: 'visit_date', width: 15 },
                { header: 'SR Code', key: 'srcode', width: 15 },
                { header: 'Name', key: 'fullname', width: 25 },
                { header: 'Time In', key: 'time_in', width: 15 },
                { header: 'Time Out', key: 'time_out', width: 15 },
                { header: 'Blood Pressure', key: 'blood_pressure', width: 15 },
                { header: 'Remarks', key: 'remarks', width: 35 }
            ];
        } else if (type === 'employee') {
            worksheet.columns = [
                { header: 'Visit Date', key: 'visit_date', width: 15 },
                { header: 'Employee ID', key: 'employee_id', width: 15 },
                { header: 'Name', key: 'fullname', width: 25 },
                { header: 'Time In', key: 'time_in', width: 15 },
                { header: 'Time Out', key: 'time_out', width: 15 },
                { header: 'Blood Pressure', key: 'blood_pressure', width: 15 },
                { header: 'Remarks', key: 'remarks', width: 35 }
            ];
        } else {
            worksheet.columns = [
                { header: 'Visit Date', key: 'visit_date', width: 15 },
                { header: 'ID Number', key: 'idNo', width: 15 },
                { header: 'Name', key: 'fullname', width: 25 },
                { header: 'Time In', key: 'time_in', width: 15 },
                { header: 'Time Out', key: 'time_out', width: 15 },
                { header: 'Purpose', key: 'purpose', width: 20 },
                { header: 'Blood Pressure', key: 'blood_pressure', width: 15 },
                { header: 'Remarks', key: 'remarks', width: 35 }
            ];
        }

        worksheet.getRow(1).font = { bold: true };
        worksheet.addRows(results);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${type}_records.xlsx"`);

        await workbook.xlsx.write(res);
        res.end();
    });
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
    db.query("SELECT * FROM master_medicines ORDER BY generic_name ASC", async (err, results) => {
        if (err) return res.status(500).json(err);
        
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Inventory');
        
        worksheet.columns = [
            { header: 'No.', key: 'index', width: 10 },
            { header: 'Generic Name', key: 'generic_name', width: 25 },
            { header: 'Brand Name', key: 'brand_name', width: 25 },
            { header: 'Quantity (Box)', key: 'quantity', width: 15 },
            { header: 'Pieces', key: 'pieces', width: 15 },
            { header: 'Expiration Date', key: 'expiration_date', width: 20 },
            { header: 'Status', key: 'status', width: 15 }
        ];
        
        worksheet.getRow(1).font = { bold: true };
        
        results.forEach((row, index) => {
            let status = 'Good';
            if (row.expiration_date && new Date(row.expiration_date) < new Date()) status = 'Expired';
            else if (row.quantity <= 2) status = 'Low Stock';
            
            worksheet.addRow({
                index: index + 1,
                generic_name: row.generic_name,
                brand_name: row.brand_name,
                quantity: row.quantity || 0,
                pieces: row.pieces || 0,
                expiration_date: row.expiration_date ? new Date(row.expiration_date).toLocaleDateString() : 'N/A',
                status: status
            });
        });
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Inventory_Records.xlsx"`);
        await workbook.xlsx.write(res);
        res.end();
    });
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

// --- SERVER START & AUTO-OPEN ---
app.listen(PORT, '0.0.0.0', () => {
    const url = `http://localhost:${PORT}`;
    console.log(`Clinic System running at ${url}`);
    exec(`start ${url}`, (err) => {
        if (err) console.error("Could not auto-open browser:", err);
    });
});