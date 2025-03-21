const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const port = 3500;

// Enable CORS for all routes
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware to parse JSON
app.use(bodyParser.json());

// Create MySQL connection
const con = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'yeet',
    database: 'bearcatbudget'
});

// Connect to MySQL
con.connect(function(err) {
    if (err) {
        return console.error('Error: ' + err.message);
    }
    console.log('Connected to the MySQL server.');
});

// Handle preflight requests
app.options('*', (req, res) => {
    console.log(`Handling preflight request`);
    res.header('Access-Control-Allow-Origin', '*'); // Allow all origins
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS'); // Allow specific methods
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Allow specific headers
    res.sendStatus(200); // Respond with HTTP 200 for preflight
});

// Other routes (e.g., /login)
app.post('/login', (req, res) => {
    console.log(`Login attempt with username: ${req.body.username}`);
    const { username, password } = req.body;
    const sql = `SELECT * FROM accounts WHERE username = ? AND password = ?`;

    con.query(sql, [username, password], (err, result) => {
        if (err) {
            // Log the detailed error on the server
            console.error('Database query error:', err);

            // Send a detailed but sanitized error response to the client
            res.status(500).send({
                success: false,
                message: 'An error occurred while querying the database.',
                error: {
                    code: err.code, // MySQL error code
                    errno: err.errno, // MySQL error number
                    sqlMessage: err.sqlMessage, // MySQL error message
                    sqlState: err.sqlState, // SQL state
                },
            });
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