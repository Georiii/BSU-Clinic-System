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

// --- API ROUTES ---
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
    const visitData = {
        srcode: data.srcode,
        visit_date: data.visit_date,
        time_in: data.time_in,
        fullname: data.fullname,
        department: data.department,
        program: data.program
    };
    db.query("INSERT INTO clinic_visits SET ?", visitData, (err) => {
        if (err) return res.status(500).json(err);
        res.status(200).json({ message: "Visit recorded!" });
    });
});

app.post('/api/submit-employee-visit', (req, res) => {
    const data = req.body;
    const visitData = {
        employee_id: data.employee_id,
        visit_date: data.visit_date,
        time_in: data.time_in,
        fullname: data.fullname,
        department: data.department,
        position: data.position,
        employment_type: data.employment_type,
        employment_status: data.employment_status
    };
    db.query("INSERT INTO employee_clinic_visit SET ?", visitData, (err) => {
        if (err) return res.status(500).json(err);
        res.status(200).json({ message: "Employee visit recorded!" });
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
    const sql = `SELECT v.visit_id, v.srcode, s.fullname, v.time_in, v.time_out 
                 FROM clinic_visits v JOIN students s ON v.srcode = s.srcode 
                 WHERE v.visit_date = CURDATE() ORDER BY v.time_in DESC`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.post('/api/timeout-student/:id', (req, res) => {
    const sql = "UPDATE clinic_visits SET time_out = CURTIME() WHERE visit_id = ?";
    db.query(sql, [req.params.id], (err) => {
        if (err) return res.status(500).json(err);
        res.status(200).json({ message: "Student timed out" });
    });
});

app.get('/api/active-employee-visits', (req, res) => {
    const sql = `SELECT v.visit_id, v.employee_id, e.fullname, v.time_in, v.time_out 
                 FROM employee_clinic_visit v JOIN employees e ON v.employee_id = e.employee_id 
                 WHERE v.visit_date = CURDATE() ORDER BY v.time_in DESC`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.post('/api/timeout-employee/:id', (req, res) => {
    const sql = "UPDATE employee_clinic_visit SET time_out = CURTIME() WHERE visit_id = ?";
    db.query(sql, [req.params.id], (err) => {
        if (err) return res.status(500).json(err);
        res.status(200).json({ message: "Employee timed out" });
    });
});

// --- SERVER START & AUTO-OPEN ---
app.listen(PORT, '0.0.0.0', () => {
    const url = `http://localhost:${PORT}`;
    console.log(`Clinic System running at ${url}`);
    
    // Improved command to open browser on Windows
    exec(`start ${url}`, (err) => {
        if (err) console.error("Could not auto-open browser:", err);
    });
});