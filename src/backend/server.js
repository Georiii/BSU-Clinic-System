const express = require('express');
const path = require('path');
const { exec } = require('child_process'); 
const db = require('./db'); 
const app = express();
const PORT = 3000;

// Serves static assets (CSS, JS, Images) from the 'src' folder
app.use(express.static(path.join(__dirname, '..')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'html', 'SLandingpage.html'));
});


app.listen(PORT, '0.0.0.0', () => {
    const url = `http://localhost:${PORT}`;
    console.log(`Clinic System running at ${url}`);
    console.log(`To access on mobile, use your IP address at port ${PORT}`);
    
    // Automatically open the default browser on your laptop
    exec(`start ${url}`); 
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

// API route to fetch student data by SR-Code for auto-fill
app.get('/api/student/:srcode', (req, res) => {
    const sql = "SELECT fullname, department, program FROM students WHERE srcode = ?";
    db.query(sql, [req.params.srcode], (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.length > 0) {
            res.json(result[0]); 
        } else {
            res.status(404).json({ message: "Student not found" });
        }
    });
});