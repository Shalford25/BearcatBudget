// Global object to store column names for each table
const tableColumnNames = {};

// Utility function to format column names
function formatColumnName(columnName) {
    return columnName
        .split('_') // Split the column name by underscores
        .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
        .join(' '); // Join the words with spaces
}

// Function to fetch and display table data
async function displayTable(tableName) {
    try {
        const username = localStorage.getItem('username');
        const sessionId = localStorage.getItem('sessionId');

        if (!username || !sessionId) {
            alert('You are not logged in.');
            window.location.href = 'login.html';
            return;
        }

        const response = await fetch(`/api/getTableData?table=${encodeURIComponent(tableName)}&username=${encodeURIComponent(username)}&sessionId=${encodeURIComponent(sessionId)}`);
        const result = await response.json();

        if (response.ok && result.success) {
            const { data, permission } = result; // Extract data and permission level
            const table = document.getElementById('dataTable');
            table.innerHTML = ''; // Clear existing table data

            if (data.length > 0) {
                // Save column names for the table
                tableColumnNames[tableName] = Object.keys(data[0]);

                // Create table headers
                const headerRow = document.createElement('tr');
                tableColumnNames[tableName].forEach(key => {
                    const th = document.createElement('th');
                    th.innerText = formatColumnName(key); // Format column names
                    headerRow.appendChild(th);
                });

                // Add action column for editing/deleting rows if the user has permission
                if (permission === 1) {
                    const actionTh = document.createElement('th');
                    actionTh.innerText = 'Actions';
                    headerRow.appendChild(actionTh);
                }

                table.appendChild(headerRow);

                // Create table rows
                data.forEach(row => {
                    const tr = document.createElement('tr');
                    tableColumnNames[tableName].forEach(key => {
                        const td = document.createElement('td');

                        // Format date columns
                        if (key.toLowerCase().includes('date') || key.toLowerCase().includes('time')) {
                            const date = new Date(row[key]);
                            if (!isNaN(date.getTime())) {
                                const formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
                                td.innerText = formattedDate;
                            } else {
                                td.innerText = row[key]; // Fallback for invalid dates
                            }
                        } else {
                            td.innerText = row[key];
                        }
                        tr.appendChild(td);
                    });

                    // Add edit and delete buttons if the user has permission
                    if (permission === 1) {
                        const actionTd = document.createElement('td');
                        const editButton = document.createElement('button');
                        editButton.innerText = 'Edit';
                        editButton.classList.add('edit-button');
                        editButton.onclick = () => editRow(row, tableName);
                        const deleteButton = document.createElement('button');
                        deleteButton.innerText = 'Delete';
                        deleteButton.classList.add('delete-button');
                        deleteButton.onclick = () => deleteRow(row, tableName);
                        actionTd.classList.add('action-buttons');
                        actionTd.appendChild(editButton);
                        actionTd.appendChild(deleteButton);
                        tr.appendChild(actionTd);
                    }

                    table.appendChild(tr);
                });

                // Add a row for adding new data if the user has permission
                if (permission === 1) {
                    const addRow = document.createElement('tr');
                    const addButton = document.createElement('button');
                    addButton.innerText = 'Add Row';
                    addButton.classList.add('add-button');
                    addButton.onclick = () => addRowToTable(tableName);
                    const addTd = document.createElement('td');
                    addTd.colSpan = tableColumnNames[tableName].length + 1; // Span all columns
                    addTd.appendChild(addButton);
                    addRow.appendChild(addTd);
                    table.appendChild(addRow);
                }
            } else {
                // Display a message if no data is available
                const noDataRow = document.createElement('tr');
                const noDataCell = document.createElement('td');
                noDataCell.colSpan = tableColumnNames[tableName].length + (permission === 1 ? 1 : 0); // Adjust colspan for "Actions" column
                noDataCell.textContent = 'No data available.';
                noDataRow.appendChild(noDataCell);
                table.appendChild(noDataRow);
            }
        } else {
            alert(result.message || 'Failed to fetch table data.');
        }
    } catch (error) {
        console.error('Error fetching table data:', error);
        alert('An error occurred while fetching table data.');
    }
}

// Function to add a new row
async function addRowToTable(tableName) {
    const table = document.getElementById('dataTable');

    // Create a new row
    const newRow = document.createElement('tr');

    // Use saved column names
    const headers = tableColumnNames[tableName].filter(header => !header.toLowerCase().includes('id') || header === 'account_id'); // Include `account_id`

    headers.forEach(header => {
        const td = document.createElement('td');
        const input = document.createElement('input');

        if (header.toLowerCase().includes('duration')) {
            input.type = 'number'; // Use a number input for duration
            input.min = '0'; // Optional: Set a minimum value
        } else if (header.toLowerCase().includes('date') || header.toLowerCase().includes('time')) {
            input.type = 'date'; // Use a date picker for date columns
        } else if (header === 'account_id') {
            input.type = 'text';
            input.value = localStorage.getItem('account_id'); // Automatically set the account ID
            input.readOnly = true; // Make it read-only
        } else {
            input.type = 'text';
        }

        input.placeholder = header;
        td.appendChild(input);
        newRow.appendChild(td);
    });

    // Add "Confirm" button
    const confirmButton = document.createElement('button');
    confirmButton.innerText = 'Confirm';
    confirmButton.onclick = async () => {
        const inputs = newRow.querySelectorAll('input');
        const rowData = {};

        // Collect data from input fields
        inputs.forEach((input, index) => {
            rowData[headers[index]] = input.value;
        });

        const username = localStorage.getItem('username');
        const sessionId = localStorage.getItem('sessionId');

        if (!username || !sessionId) {
            alert('You are not logged in.');
            window.location.href = 'login.html';
            return;
        }

        try {
            const response = await fetch('/api/addRow', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ table: tableName, row: rowData, username, sessionId }),
            });
            const result = await response.json();
            if (result.success) {
                alert('Row added successfully!');
                displayTable(tableName); // Refresh the table
            } else {
                alert(result.message || 'Failed to add row.');
            }
        } catch (error) {
            console.error('Error adding row:', error);
            alert('An error occurred while adding the row.');
        }
    };

    const confirmTd = document.createElement('td');
    confirmTd.appendChild(confirmButton);
    newRow.appendChild(confirmTd);

    // Append the new row to the table
    table.appendChild(newRow);
}

// Function to edit a row
async function editRow(row, tableName) {
    const table = document.getElementById('dataTable');
    const idField = `${tableName}_id`; // Assuming the ID field is named as tableName_id

    if (!idField) {
        alert('Invalid table name.');
        console.error('Invalid table name:', tableName);
        return;
    }

    const rowId = row[idField];
    if (!rowId) {
        alert('Invalid row data. Missing row ID.');
        console.error('Invalid row data:', row, 'Expected ID field:', idField);
        return;
    }

    const rowElement = Array.from(table.rows).find(tr => {
        const firstCell = tr.cells[0];
        return firstCell && firstCell.innerText == rowId; // Match the row by ID
    });

    if (!rowElement) {
        alert('Row not found in the table.');
        console.error('Row not found. Row ID:', rowId, 'Table name:', tableName);
        return;
    }

    console.log('Editing row element:', rowElement);

    // Replace cells with input fields
    const originalValues = {};
    const headers = tableColumnNames[tableName]; // Use saved column names

    headers.forEach((header, index) => {
        const cell = rowElement.cells[index];
        originalValues[header] = cell.innerText;

        if (header !== idField) { // Skip the ID column
            const input = document.createElement('input');

            // Apply restrictions based on column name
            if (header.toLowerCase().includes('duration')) {
                input.type = 'number'; // Use a number input for duration
                input.min = '0'; // Optional: Set a minimum value
            } else if (
                header.toLowerCase().includes('date') ||
                header.toLowerCase().includes('time') ||
                header.toLowerCase() === 'service_start'
            ) {
                input.type = 'date'; // Use a date picker for date columns
            } else {
                input.type = 'text';
            }

            input.value = cell.innerText;
            input.dataset.column = header; // Store the column name for later
            cell.innerHTML = '';
            cell.appendChild(input);
        }
    });

    // Replace the "Actions" column with Confirm and Cancel buttons
    const actionsCell = rowElement.cells[rowElement.cells.length - 1];
    const confirmButton = document.createElement('button');
    confirmButton.innerText = 'Confirm';
    confirmButton.onclick = async () => {
        const inputs = rowElement.querySelectorAll('input');
        const updatedRow = { [idField]: rowId }; // Include the ID in the updated data

        inputs.forEach(input => {
            let value = input.value;

            // Handle numeric inputs
            if (input.type === 'number') {
                value = parseInt(value, 10); // Ensure the value is an integer
                if (isNaN(value)) {
                    value = null; // Handle invalid numbers
                }
            }

            // Handle date inputs
            if (input.type === 'date') {
                const date = new Date(input.value);
                value = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
            }

            updatedRow[input.dataset.column] = value;
        });

        const username = localStorage.getItem('username');
        const sessionId = localStorage.getItem('sessionId');

        if (!username || !sessionId) {
            alert('You are not logged in.');
            window.location.href = 'login.html';
            return;
        }

        try {
            const response = await fetch('/api/editRow', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    table: tableName,
                    row: updatedRow,
                    username,
                    sessionId,
                }),
            });
            const result = await response.json();
            if (result.success) {
                alert('Row updated successfully!');
                displayTable(tableName); // Refresh the table
            } else {
                alert(result.message || 'Failed to update row.');
            }
        } catch (error) {
            console.error('Error updating row:', error);
            alert('An error occurred while updating the row.');
        }
    };

    const cancelButton = document.createElement('button');
    cancelButton.innerText = 'Cancel';
    cancelButton.onclick = () => {
        // Restore original values
        headers.forEach((header, index) => {
            const cell = rowElement.cells[index];
            cell.innerHTML = originalValues[header];
        });
    };

    actionsCell.innerHTML = '';
    actionsCell.appendChild(confirmButton);
    actionsCell.appendChild(cancelButton);
}

// Function to delete a row
async function deleteRow(row, tableName) {
    if (confirm('Are you sure you want to delete this row?')) {
        const username = localStorage.getItem('username');
        const sessionId = localStorage.getItem('sessionId');

        if (!username || !sessionId) {
            alert('You are not logged in.');
            window.location.href = 'login.html';
            return;
        }

        // Extract the correct ID field based on the table name
        const idField = {
            service: 'service_id',
            transaction: 'transaction_id',
            inventory: 'inventory_id',
        }[tableName];

        if (!idField || !row[idField]) {
            alert('Invalid row or table name.');
            console.error('Invalid row or table name:', { row, tableName });
            return;
        }

        try {
            console.log('Sending delete request:', {
                table: tableName,
                row: { id: row[idField] },
            });

            const response = await fetch('/api/deleteRow', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    table: tableName,
                    row: { id: row[idField] },
                    username,
                    sessionId,
                }),
            });
            const result = await response.json();
            if (result.success) {
                alert('Row deleted successfully!');
                displayTable(tableName); // Refresh the table
            } else if (response.status === 403) {
                alert('You do not have permission to delete rows.');
            } else {
                alert(result.message || 'Failed to delete row.');
            }
        } catch (error) {
            console.error('Error deleting row:', error);
            alert('An error occurred while deleting the row.');
        }
    }
}
