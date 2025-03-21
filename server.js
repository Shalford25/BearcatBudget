const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const port = 3500;

// Enable CORS for all routes
app.use(cors()); // Allow all requests from the same origin

// Middleware to parse JSON
app.use(bodyParser.json());

// Add custom headers
app.use((req, res, next) => {
    res.setHeader('X-Powered-By', 'BearcatBudget');
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
});

// Create a MySQL connection pool
const pool = mysql.createPool({
    connectionLimit: 10, // Maximum number of connections in the pool
    host: 'localhost',
    user: 'root',
    password: 'yeet',
    database: 'bearcatbudget',
    port: 3306
});

pool.on('error', (err) => {
    console.error('MySQL Pool Error:', err);
});

// Handle preflight requests
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*'); // Echo the origin
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || 'Content-Type, Authorization');
    res.header('Access-Control-Max-Age', '86400'); // Cache preflight response for 24 hours
    res.sendStatus(200); // Respond with HTTP 200 for preflight
});

// Other routes (e.g., /login)
app.post('/login', (req, res) => {
    console.log(`Login attempt with username: ${req.body.username}`);
    const { username, password } = req.body;
    const sql = `SELECT * FROM accounts WHERE username = ? AND password = ?`;

    pool.query(sql, [username, password], (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            res.status(500).send({
                success: false,
                message: 'An error occurred while querying the database.',
                error: err.code, // Include the error code for debugging
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