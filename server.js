const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const port = 3500;

// Enable CORS for all routes
app.use(cors({
    origin: '*'
}));

// Middleware to parse JSON
app.use(bodyParser.json());

// Log incoming requests
app.use((req, res, next) => {
    console.log(`Incoming request: ${req.method} ${req.url}`);
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

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});

// Other routes (e.g., /login)
app.post('/login', (req, res) => {
    try {
        console.log('Received POST request to /login'); // Debugging log
        console.log('Request body:', req.body); // Debugging log

        const { username, password } = req.body;

        if (!username || !password) {
            console.error('Missing username or password'); // Debugging log
            return res.status(400).json({
                success: false,
                message: 'Username and password are required.',
            });
        }

        const sql = `SELECT * FROM accounts WHERE username = ? AND password = ?`;

        console.log('Executing query:', sql); // Debugging log
        console.log('Query parameters:', [username, password]); // Debugging log

        pool.query(sql, [username, password], (err, result) => {
            if (err) {
                console.error('Database query error:', err); // Debugging log
                return res.status(500).json({
                    success: false,
                    message: 'Failed to connect to the server. Please try again later.',
                });
            }

            console.log('Query result:', result); // Debugging log

            if (result.length > 0) {
                // User found
                res.json({ success: true, message: 'Login successful!' });
            } else {
                // No matching user found
                res.status(401).json({ success: false, message: 'Invalid username or password.' });
            }
        });
    } catch (error) {
        console.error('Unexpected error in /login route:', error); // Debugging log
        res.status(500).json({
            success: false,
            message: 'An unexpected error occurred. Please try again later.',
        });
    }
});