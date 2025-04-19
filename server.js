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

// Creating a MySQL connection pool
const pool = mysql.createPool({
    connectionLimit: 10,
    host: '127.0.0.1', // Localhost IP
    user: 'root',
    password: 'yeet',
    database: 'bearcatbudget',
    port: 3306,
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
                const accountId = result[0].account_id; // Get the account_id from the database
                loggedInAccounts[username] = { sessionId, loginTime: new Date(), accountId };

                console.log('Logged in user:', { username, sessionId, accountId }); // Debugging log
                res.json({ success: true, message: 'Login successful!', sessionId, accountId });
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
    console.log('Logout request received:', req.body); // Debugging

    const { username, sessionId } = req.body;

    if (!username || !sessionId) {
        console.log('Missing username or sessionId in logout request.'); // Debugging
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
        console.log('Invalid session or user is not logged in.'); // Debugging
        res.status(400).json({
            success: false,
            message: 'Invalid session or user is not logged in.',
        });
    }
});

app.get('/api/isLoggedIn', (req, res) => {
    const { username, sessionId } = req.query;

    if (!username || !sessionId) {
        return res.status(400).json({
            success: false,
            message: 'Username and session ID are required.',
        });
    }

    const session = loggedInAccounts[username];
    if (session && session.sessionId === sessionId) {
        return res.json({
            success: true,
            isLoggedIn: true,
        });
    } else {
        return res.status(403).json({
            success: false,
            isLoggedIn: false,
            message: 'Invalid session. Please log in again.',
        });
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

app.get('/api/getGraphData', (req, res) => {
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

    // Fetch data for the graph
    const sql = `SELECT * FROM ??`;
    pool.query(sql, [table], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch graph data.',
            });
        }

        res.json({
            success: true,
            data: results,
        });
    });
});

// Route to add a new row
app.post('/api/addRow', checkPermissions, (req, res) => {
    const { table, row, username, sessionId } = req.body;

    // Validate session
    const session = loggedInAccounts[username];
    if (!session || session.sessionId !== sessionId) {
        return res.status(403).json({
            success: false,
            message: 'Invalid session. Please log in again.',
        });
    }

    // Ensure account_id matches the logged-in user's account
    if (row.account_id && row.account_id !== session.accountId) {
        return res.status(403).json({
            success: false,
            message: 'You are not authorized to add rows for this account.',
        });
    }

    // Proceed with adding the row
    const allowedColumns = allowedTables[table];
    if (!allowedColumns) {
        return res.status(400).json({
            success: false,
            message: 'Invalid table name.',
        });
    }

    const filteredRow = {};
    Object.keys(row).forEach((key) => {
        if (allowedColumns.includes(key)) {
            filteredRow[key] = row[key];
        }
    });

    if (Object.keys(filteredRow).length === 0) {
        return res.status(400).json({
            success: false,
            message: 'No valid columns provided for the table.',
        });
    }

    const columns = Object.keys(filteredRow).join(', ');
    const values = Object.values(filteredRow);
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

    console.log('Incoming table:', table); // Debugging
    console.log('Incoming row:', row); // Debugging

    if (!table || !row) {
        return res.status(400).json({
            success: false,
            message: 'Table name and row data are required.',
        });
    }

    // Validate table name
    const allowedColumns = allowedTables[table];
    if (!allowedColumns) {
        return res.status(400).json({
            success: false,
            message: 'Invalid table name.',
        });
    }

    // Filter row data to include only allowed columns
    const filteredRow = {};
    Object.keys(row).forEach((key) => {
        if (allowedColumns.includes(key)) {
            filteredRow[key] = row[key];
        }
    });

    console.log('Filtered row:', filteredRow); // Debugging

    if (Object.keys(filteredRow).length === 0) {
        return res.status(400).json({
            success: false,
            message: 'No valid columns provided for the table.',
        });
    }

    // Construct the SQL query
    const idField = `${table}_id`; // Assuming the ID field is named as table_id
    const idValue = row[idField];
    delete filteredRow[idField]; // Remove the ID field from the update data

    const setClause = Object.keys(filteredRow)
        .map(key => `${key} = ?`)
        .join(', ');
    const values = [...Object.values(filteredRow), idValue];

    console.log('Constructed SQL query:', `UPDATE ${table} SET ${setClause} WHERE ${idField} = ?`); // Debugging

    const sql = `UPDATE ?? SET ${setClause} WHERE ${idField} = ?`;
    pool.query(sql, [table, ...values], (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to update row in the database.',
            });
        }

        res.json({ success: true, message: 'Row updated successfully!' });
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

const allowedTables = {
    service: ['service_id', 'service_name', 'service_description', 'service_price', 'service_duration', 'service_start', 'service_update'],
    transaction: ['transaction_id', 'account_id', 'transaction_type', 'transaction_amount', 'transaction_date', 'status'],
    inventory: ['inventory_id', 'item_name', 'description', 'quantity', 'unit_price', 'last_updated'],
};