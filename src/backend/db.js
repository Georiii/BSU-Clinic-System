const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bsu_clinic_db'
});

db.connect((err) => {
    if (err) throw err;
    console.log('Successfully connected to bsu_clinic_db');
});

module.exports = db;