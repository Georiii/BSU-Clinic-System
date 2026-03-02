const express = require('express');
const path = require('path');
const { exec } = require('child_process'); // New: Import child_process
const db = require('./db'); // This looks for db.js in the same folder
const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, '..')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'html', 'SLandingpage.html'));
});

app.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`Clinic System running at ${url}`);
    
    // Automatically open the default browser
    exec(`start ${url}`); 
});

app.get('/choose', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'html', 'SChoose.html'));
});

// Route for Student Form
app.get('/html/StudentForm.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'html', 'StudentForm.html'));
});

// Route for Employee Form
app.get('/html/EmployeeForm.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'html', 'EmployeeForm.html'));
});

// This route searches the database for a specific student
app.get('/api/student/:srcode', (req, res) => {
    const sql = "SELECT fullname, department, program FROM students WHERE srcode = ?";
    db.query(sql, [req.params.srcode], (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.length > 0) {
            res.json(result[0]); // Send back the name, dept, and program
        } else {
            res.status(404).json({ message: "Student not found" });
        }
    });
});