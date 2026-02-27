const express = require('express');
const path = require('path');
const { exec } = require('child_process'); // New: Import child_process
const app = express();
const PORT = 8080;

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