const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors());

// Create MySQL connection
const con = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'yeet',
    database: 'bearcatbudget'
});

// Connect to MySQL
connection.connect(function(err) {
if (err) {
   return console.error('error: ' + err.message);
}  
   console.log('Connected to the MySQL server.');
});

// Middleware to parse JSON
app.use(bodyParser.json());

// Login endpoint
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const sql = `SELECT * FROM accounts WHERE username = ? AND password = ?`;
    con.query(sql, [username, password], (err, result) => {
        if (err) {
            res.status(500).send('Error querying the database');
            return;
        }
        if (result.length > 0) {
            res.send({ success: true, message: 'Login successful!' });
        } else {
            res.send({ success: false, message: 'Invalid username or password.' });
        }
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});