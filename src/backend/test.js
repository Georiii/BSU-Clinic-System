const db = require('./db');

// Test if we can find one of your students from the Excel file
db.query("SELECT fullname FROM students LIMIT 1", (err, result) => {
    if (err) throw err;
    console.log("Database connection is working! Found student:", result[0].fullname);
    process.exit();
});