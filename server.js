const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require('crypto'); // For generating unique session IDs
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

// Global object to track logged-in accounts
const loggedInAccounts = {};

// Middleware to check if the user is logged in and has permission level 1
function checkPermissions(req, res, next) {
    const { username, sessionId } = req.body;

    console.log('Checking permissions for:', { username, sessionId });

    if (!username || !sessionId) {
        console.log('Missing username or sessionId');
        return res.status(401).json({
            success: false,
            message: 'You must be logged in to perform this action.',
        });
    }

    const session = loggedInAccounts[username];
    console.log('Session data for user:', session);

    if (!session) {
        console.log(`No session found for user: ${username}`);
        return res.status(403).json({
            success: false,
            message: 'Invalid session. Please log in again.',
        });
    }

    if (session.sessionId !== sessionId) {
        console.log(`Session ID mismatch for user: ${username}`);
        console.log(`Expected: ${session.sessionId}, Received: ${sessionId}`);
        return res.status(403).json({
            success: false,
            message: 'Invalid session. Please log in again.',
        });
    }

    // Check permission level
    const sql = `SELECT permission FROM accounts WHERE username = ?`;
    pool.query(sql, [username], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to verify permissions.',
            });
        }

        console.log('Permission query results:', results);

        if (results.length > 0 && results[0].permission === 1) {
            console.log('User has permission:', username);
            next(); // User has permission, proceed to the next middleware
        } else {
            console.log('User does not have permission:', username);
            res.status(403).json({
                success: false,
                message: 'You do not have permission to perform this action.',
            });
        }
    });
}

// Other routes (e.g., /login)
app.post('/api/login', (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required.',
            });
        }

        const sql = `SELECT * FROM accounts WHERE username = ? AND password = ?`;

        pool.query(sql, [username, password], (err, result) => {
            if (err) {
                console.error('Database query error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to connect to the server. Please try again later.',
                });
            }

            if (result.length > 0) {
                const sessionId = crypto.randomBytes(16).toString('hex');
                loggedInAccounts[username] = { sessionId, loginTime: new Date() };

                console.log('Logged in user:', { username, sessionId }); // Debugging log
                res.json({ success: true, message: 'Login successful!', sessionId });
            } else {
                res.status(401).json({ success: false, message: 'Invalid username or password.' });
            }
        });
    } catch (error) {
        console.error('Unexpected error in /api/login route:', error);
        res.status(500).json({
            success: false,
            message: 'An unexpected error occurred. Please try again later.',
        });
    }
});

app.post('/api/logout', (req, res) => {
    const { username, sessionId } = req.body;

    if (!username || !sessionId) {
        return res.status(400).json({
            success: false,
            message: 'Username and session ID are required to log out.',
        });
    }

    if (loggedInAccounts[username] && loggedInAccounts[username].sessionId === sessionId) {
        delete loggedInAccounts[username];
        console.log(`User ${username} has logged out.`);
        res.json({ success: true, message: 'Logout successful!' });
    } else {
        res.status(400).json({
            success: false,
            message: 'Invalid session or user is not logged in.',
        });
    }
});

app.get('/api/isLoggedIn', (req, res) => {
    const { username, sessionId } = req.query;

    console.log('Received /api/isLoggedIn request:', { username, sessionId }); // Debugging log

    if (!username || !sessionId) {
        console.log('Missing username or sessionId'); // Debugging log
        return res.status(400).json({
            success: false,
            message: 'Username and session ID are required to check login status.',
        });
    }

    const session = loggedInAccounts[username];
    console.log('Session data for user:', session); // Debugging log

    if (session && session.sessionId === sessionId) {
        console.log('Session is valid'); // Debugging log
        res.setHeader('Content-Type', 'application/json');
        res.json({ success: true, isLoggedIn: true, loginTime: session.loginTime });
    } else {
        console.log('Session is invalid or expired'); // Debugging log
        res.json({ success: true, isLoggedIn: false });
    }
});

app.get('/api/getTableData', (req, res) => {
    const { table, username, sessionId } = req.query;

    if (!table || !username || !sessionId) {
        return res.status(400).json({
            success: false,
            message: 'Table name, username, and session ID are required.',
        });
    }

    // Validate session
    const session = loggedInAccounts[username];
    if (!session || session.sessionId !== sessionId) {
        return res.status(403).json({
            success: false,
            message: 'Invalid session. Please log in again.',
        });
    }

    // Validate table name to prevent SQL injection
    const allowedTables = ['service', 'transaction', 'inventory'];
    if (!allowedTables.includes(table)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid table name.',
        });
    }

    // Fetch permission level
    const sqlPermission = `SELECT permission FROM accounts WHERE username = ?`;
    pool.query(sqlPermission, [username], (err, permissionResults) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch user permissions.',
            });
        }

        if (permissionResults.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'User not found.',
            });
        }

        const userPermission = permissionResults[0].permission;

        // Fetch table data
        const sql = `SELECT * FROM ??`;
        pool.query(sql, [table], (err, results) => {
            if (err) {
                console.error('Database query error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to fetch table data.',
                });
            }

            res.json({
                success: true,
                data: results,
                permission: userPermission, // Include permission level in the response
            });
        });
    });
});

// Route to add a new row
app.post('/api/addRow', checkPermissions, (req, res) => {
    const { table, row } = req.body;

    if (!table || !row) {
        return res.status(400).json({
            success: false,
            message: 'Table name and row data are required.',
        });
    }

    // Validate table name to prevent SQL injection
    const allowedTables = ['service', 'transaction', 'inventory'];
    if (!allowedTables.includes(table)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid table name.',
        });
    }

    // Exclude the "id" field from the row data
    const tableIdColumns = {
        service: 'service_id',
        transaction: 'transaction_id',
        inventory: 'inventory_id',
    };
    const idColumn = tableIdColumns[table];
    delete row[idColumn];

    // Insert the row into the database
    const columns = Object.keys(row).join(', ');
    const values = Object.values(row);
    const placeholders = values.map(() => '?').join(', ');

    const sql = `INSERT INTO ?? (${columns}) VALUES (${placeholders})`;
    pool.query(sql, [table, ...values], (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to add row to the database.',
            });
        }

        res.json({ success: true, message: 'Row added successfully!' });
    });
});

// Route to edit a row
app.post('/api/editRow', checkPermissions, (req, res) => {
    const { table, row } = req.body;

    console.log('Received request to edit row:', { table, row });

    if (!table || !row || !row.id) {
        console.log('Missing table name or row ID');
        return res.status(400).json({
            success: false,
            message: 'Table name and row ID are required.',
        });
    }

    // Map table names to their respective ID columns
    const tableIdColumns = {
        service: 'service_id',
        transaction: 'transaction_id',
        inventory: 'inventory_id',
    };

    const idColumn = tableIdColumns[table];
    if (!idColumn) {
        console.log('Invalid table name:', table);
        return res.status(400).json({
            success: false,
            message: 'Invalid table name.',
        });
    }

    const { id, ...updateData } = row; // Extract the ID and the rest of the row data

    const sql = `UPDATE ?? SET ? WHERE ?? = ?`;
    pool.query(sql, [table, updateData, idColumn, id], (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to update row.',
            });
        }

        console.log('Row updated successfully:', { table, id });
        res.json({ success: true, message: 'Row updated successfully.' });
    });
});

// Route to delete a row
app.post('/api/deleteRow', checkPermissions, (req, res) => {
    const { table, row } = req.body;

    if (!table || !row || !row.id) {
        return res.status(400).json({
            success: false,
            message: 'Table name and row ID are required.',
        });
    }

    // Map table names to their respective ID columns
    const tableIdColumns = {
        service: 'service_id',
        transaction: 'transaction_id',
        inventory: 'inventory_id',
    };

    const idColumn = tableIdColumns[table];
    if (!idColumn) {
        return res.status(400).json({
            success: false,
            message: 'Invalid table name.',
        });
    }

    const deleteSql = `DELETE FROM ?? WHERE ?? = ?`;
    pool.query(deleteSql, [table, idColumn, row.id], (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to delete row.',
            });
        }

        console.log(`Row deleted from table ${table} with ID ${row.id}`);

        // Re-sequence the IDs using a subquery
        const resequenceSql = `
            WITH RESEQUENCED AS (
                SELECT ${idColumn}, ROW_NUMBER() OVER (ORDER BY ${idColumn}) AS new_id
                FROM ${table}
            )
            UPDATE ${table}
            JOIN RESEQUENCED ON ${table}.${idColumn} = RESEQUENCED.${idColumn}
            SET ${table}.${idColumn} = RESEQUENCED.new_id;
        `;
        const resetAutoIncrementSql = `ALTER TABLE ${table} AUTO_INCREMENT = 1`;

        // Execute the queries sequentially
        pool.query(resequenceSql, (err) => {
            if (err) {
                console.error('Error re-sequencing IDs:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to re-sequence IDs.',
                });
            }

            pool.query(resetAutoIncrementSql, (err) => {
                if (err) {
                    console.error('Error resetting AUTO_INCREMENT:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to reset AUTO_INCREMENT.',
                    });
                }

                res.json({ success: true, message: 'Row deleted and IDs re-sequenced successfully.' });
            });
        });
    });
});