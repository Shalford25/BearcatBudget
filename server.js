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
    connectionLimit: 10,
    host: '127.0.0.1', // Use IPv4 explicitly
    user: 'root',
    password: 'yeet',
    database: 'bearcatbudget',
    port: 3306, // Ensure this matches your MySQL server's port
});

// Periodically ping the database to keep the connection alive
setInterval(() => {
    pool.query('SELECT 1', (err) => {
        if (err) {
            console.error('Error pinging the database:', err);
        } else {
            console.log('Database connection is alive.');
        }
    });
}, 60000); // Ping every 60 seconds

// Handle MySQL pool errors
pool.on('error', (err) => {
    console.error('MySQL Pool Error:', err);

    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.error('Database connection was closed.');
    } else if (err.code === 'ER_CON_COUNT_ERROR') {
        console.error('Database has too many connections.');
    } else if (err.code === 'ECONNREFUSED') {
        console.error('Database connection was refused.');
    }
});

// Reconnect on fatal errors
function handleDisconnect() {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting connection from pool:', err);

            // Retry after 2 seconds if the connection fails
            setTimeout(handleDisconnect, 2000);
        } else {
            console.log('Reconnected to the database.');
            if (connection) connection.release();
        }
    });
}
handleDisconnect();

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
    console.log('Received POST request to /login'); // Debugging log
    console.log('Request body:', req.body); // Debugging log

    const { username, password } = req.body;

    if (!username || !password) {
        res.status(400).send({
            success: false,
            message: 'Username and password are required.',
        });
        return;
    }

    const sql = `SELECT * FROM accounts WHERE username = ? AND password = ?`;

    console.log('Executing query:', sql); // Debugging log
    console.log('Query parameters:', [username, password]); // Debugging log

    pool.query(sql, [username, password], (err, result) => {
        if (err) {
            console.error('Database query error:', err); // Debugging log
            res.status(500).send({
                success: false,
                message: 'An error occurred while querying the database.',
                error: err.code, // Include the error code for debugging
            });
            return;
        }

        console.log('Query result:', result); // Debugging log

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