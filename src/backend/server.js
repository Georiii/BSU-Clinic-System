const express = require('express');
const path = require('path');
const { exec } = require('child_process'); 
const db = require('./db'); 
const app = express();
const PORT = 3000;

// --- MIDDLEWARE ---
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// --- GLOBAL CONFIG ---
db.query("SET time_zone = '+08:00'", (err) => {
    if (err) console.error("Error setting timezone:", err);
    else console.log("Database timezone set to +08:00 (Manila Time)");
});

// --- HTML ROUTES ---
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, '..', 'html', 'SLandingpage.html')); });
app.get('/choose', (req, res) => { res.sendFile(path.join(__dirname, '..', 'html', 'SChoose.html')); });
app.get('/html/StudentForm.html', (req, res) => { res.sendFile(path.join(__dirname, '..', 'html', 'StudentForm.html')); });
app.get('/html/EmployeeForm.html', (req, res) => { res.sendFile(path.join(__dirname, '..', 'html', 'EmployeeForm.html')); });
app.get('/success', (req, res) => { res.sendFile(path.join(__dirname, '..', 'html', 'SuccessPage.html')); });
app.get('/html/NewSForm.html', (req, res) => { res.sendFile(path.join(__dirname, '..', 'html', 'NewSForm.html')); });
app.get('/html/NewEForm.html', (req, res) => { res.sendFile(path.join(__dirname, '..', 'html', 'NewEForm.html')); });
app.get('/html/TimeoutForm.html', (req, res) => { res.sendFile(path.join(__dirname, '..', 'html', 'TimeoutForm.html')); });
app.get('/html/VisitorForm.html', (req, res) => { res.sendFile(path.join(__dirname, '..', 'html', 'VisitorForm.html')); });

// --- API ROUTES ---

// NEW: Fetch Master Lists for Modals
app.get('/api/symptoms', (req, res) => {
    db.query("SELECT * FROM master_symptoms ORDER BY symp_name ASC", (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.get('/api/medicines', (req, res) => {
    db.query("SELECT * FROM master_medicines ORDER BY generic_name ASC", (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
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

// --- TIME OUT API ROUTES WITH WORKFLOW INTEGRATION ---
app.get('/api/active-student-visits', (req, res) => {
    const sql = `SELECT v.visit_id, v.srcode, s.fullname, v.time_in, v.time_out, 
                        v.purpose_medical_consult, v.purpose_blood_pressure, 
                        v.purpose_med_cert, v.purpose_pre_enrolment 
                 FROM clinic_visits v JOIN students s ON v.srcode = s.srcode 
                 WHERE v.visit_date = CURDATE() ORDER BY v.time_in DESC`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.post('/api/timeout-student/:id', (req, res) => {
    const visitId = req.params.id;
    const data = req.body;

    const sql = `UPDATE clinic_visits 
                 SET time_out = CURTIME(), blood_pressure = ?, consideration = ?, cert_status = ?, hold_reason = ? 
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
            db.query(medSql, [medValues], (err) => { if(err) console.error(err); });
        }

        res.status(200).json({ message: "Student timed out and data saved" });
    });
});

app.get('/api/active-employee-visits', (req, res) => {
    const sql = `SELECT v.visit_id, v.employee_id, e.fullname, v.time_in, v.time_out, v.purpose_of_visit 
                 FROM employee_clinic_visit v JOIN employees e ON v.employee_id = e.employee_id 
                 WHERE v.visit_date = CURDATE() ORDER BY v.time_in DESC`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.post('/api/timeout-employee/:id', (req, res) => {
    const visitId = req.params.id;
    const data = req.body;

    const sql = `UPDATE employee_clinic_visit 
                 SET time_out = CURTIME(), blood_pressure = ?, consideration = ?, cert_status = ?, hold_reason = ? 
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
            db.query(medSql, [medValues], (err) => { if(err) console.error(err); });
        }

        res.status(200).json({ message: "Employee timed out and data saved" });
    });
});


app.get('/api/active-visitor-visits', (req, res) => {
    const sql = `SELECT visit_id, idNo, fullname, time_in, time_out, purpose 
                 FROM visitor_logs 
                 WHERE visit_date = CURDATE() ORDER BY time_in DESC`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.post('/api/timeout-visitor/:id', (req, res) => {
    const visitId = req.params.id;
    const data = req.body;

    const sql = `UPDATE visitor_logs 
                 SET time_out = CURTIME(), blood_pressure = ?, consideration = ?, cert_status = ?, hold_reason = ? 
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
            db.query(medSql, [medValues], (err) => { if(err) console.error(err); });
        }

        res.status(200).json({ message: "Visitor timed out and data saved" });
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