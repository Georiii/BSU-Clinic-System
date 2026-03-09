const express = require('express');
const path = require('path');
const { exec } = require('child_process'); 
const db = require('./db'); 
const app = express();
const PORT = 3000;

// --- MIDDLEWARE ---
// Essential for reading JSON data from the clinic's Fetch requests
app.use(express.json());
// Serves CSS, JS, and Images from the root directory
app.use(express.static(path.join(__dirname, '..')));

// --- HTML ROUTES ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'html', 'SLandingpage.html'));
});

app.get('/choose', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'html', 'SChoose.html'));
});

app.get('/html/StudentForm.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'html', 'StudentForm.html'));
});

app.get('/html/EmployeeForm.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'html', 'EmployeeForm.html'));
});

app.get('/success', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'html', 'SuccessPage.html'));
});

app.get('/html/NewSForm.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'html', 'NewSForm.html'));
});

app.get('/html/NewEForm.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'html', 'NewEForm.html'));
});

// --- API ROUTES ---

// 1. Fetch Student Data (Auto-fill)
app.get('/api/student/:srcode', (req, res) => {
    const sql = "SELECT fullname, department, program FROM students WHERE srcode = ?";
    db.query(sql, [req.params.srcode], (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.length > 0) res.json(result[0]); 
        else res.status(404).json({ message: "Student not found" });
    });
});

// 2. Fetch Employee Data (Auto-fill)
app.get('/api/employee/:id', (req, res) => {
    const sql = "SELECT fullname, department, position, employment_type, employment_status FROM employees WHERE TRIM(employee_id) = ?";
    db.query(sql, [req.params.id], (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.length > 0) res.json(result[0]); 
        else res.status(404).json({ message: "Employee not found" });
    });
});

// 3. Submit Student Visit
app.post('/api/submit-visit', (req, res) => {
    const data = req.body;
    const sql = "INSERT INTO clinic_visits SET ?";
    db.query(sql, data, (err, result) => {
        if (err) return res.status(500).json(err);
        res.status(200).json({ message: "Visit recorded!" });
    });
});

// 4. Submit Employee Visit
app.post('/api/submit-employee-visit', (req, res) => {
    const data = req.body;
    const sql = "INSERT INTO employee_clinic_visit SET ?";
    db.query(sql, data, (err, result) => {
        if (err) {
            console.error("Database Error:", err);
            return res.status(500).json(err);
        }
        res.status(200).json({ message: "Employee visit recorded!" });
    });
});

// 5. Register New Employee (Master List)
app.post('/api/register-employee', (req, res) => {
    const data = req.body;
    const sql = "INSERT INTO employees SET ?";
    
    db.query(sql, data, (err, result) => {
        if (err) {
            console.error("Database Error:", err);
            return res.status(500).json(err);
        }
        res.status(200).json({ message: "Registration successful" });
    });
});

// 6. Register New Student (Master List)
app.post('/api/register-student', (req, res) => {
    const data = req.body;
    const sql = "INSERT INTO students SET ?";
    
    db.query(sql, data, (err, result) => {
        if (err) {
            console.error("Database Error:", err);
            return res.status(500).json(err);
        }
        res.status(200).json({ message: "Student registered successfully!" });
    });
});

// --- SERVER START ---
app.listen(PORT, '0.0.0.0', () => {
    const url = `http://localhost:${PORT}`;
    console.log(`Clinic System running at ${url}`);
    exec(`start ${url}`); 
});