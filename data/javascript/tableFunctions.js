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

            // Create table headers
            const headerRow = document.createElement('tr');
            Object.keys(data[0]).forEach(key => {
                const th = document.createElement('th');
                th.innerText = key;
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
                Object.entries(row).forEach(([key, value]) => {
                    const td = document.createElement('td');

                    // Format date columns
                    if (key.toLowerCase().includes('date') || key.toLowerCase().includes('time')) {
                        const date = new Date(value);
                        if (!isNaN(date.getTime())) {
                            // Convert to EST
                            const estDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
                            const formattedDate = `${estDate.getMonth() + 1}/${estDate.getDate()}/${estDate.getFullYear()}`;
                            td.innerText = formattedDate;
                        } else {
                            td.innerText = value; // Fallback for invalid dates
                        }
                    } else if (key.toLowerCase() === 'service_start') {
                        const date = new Date(value);
                        if (!isNaN(date.getTime())) {
                            // Format the date as MM/DD/YYYY
                            const formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
                            td.innerText = formattedDate;
                        } else {
                            td.innerText = value; // Fallback for invalid dates
                        }
                    } else {
                        td.innerText = value;
                    }
                    tr.appendChild(td);
                });

                // Add edit and delete buttons if the user has permission
                if (permission === 1) {
                    const actionTd = document.createElement('td');
                    const editButton = document.createElement('button');
                    editButton.innerText = 'Edit';
                    editButton.onclick = () => editRow(row, tableName);
                    const deleteButton = document.createElement('button');
                    deleteButton.innerText = 'Delete';
                    deleteButton.onclick = () => deleteRow(row, tableName);
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
                addButton.onclick = () => addRowToTable(tableName);
                const addTd = document.createElement('td');
                addTd.colSpan = Object.keys(data[0]).length + 1; // Span all columns
                addTd.appendChild(addButton);
                addRow.appendChild(addTd);
                table.appendChild(addRow);
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

    // Exclude the "id" column from input fields
    const headers = Array.from(table.rows[0].cells).map(cell => cell.innerText);
    const columnCount = headers.length - 1; // Exclude the "Actions" column
    const idField = {
        service: 'service_id',
        transaction: 'transaction_id',
        inventory: 'inventory_id',
    }[tableName];

    for (let i = 0; i < columnCount; i++) {
        if (headers[i] === idField) continue; // Skip the "id" column

        const td = document.createElement('td');
        const input = document.createElement('input');

        if (headers[i].toLowerCase().includes('duration')) {
            input.type = 'number'; // Use a number input for duration
            input.min = '0'; // Optional: Set a minimum value
        } else if (
            headers[i].toLowerCase().includes('date') ||
            headers[i].toLowerCase().includes('time') ||
            headers[i].toLowerCase() === 'service_start'
        ) {
            input.type = 'date'; // Use a date picker for date columns
        } else {
            input.type = 'text';
        }

        input.placeholder = `${headers[i]}`;
        td.appendChild(input);
        newRow.appendChild(td);
    }

    // Add "Confirm" and "Cancel" buttons
    const actionTd = document.createElement('td');
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
            } else if (response.status === 403) {
                alert('You do not have permission to add rows.');
            } else {
                alert(result.message || 'Failed to add row.');
            }
        } catch (error) {
            console.error('Error adding row:', error);
            alert('An error occurred while adding the row.');
        }
    };

    const cancelButton = document.createElement('button');
    cancelButton.innerText = 'Cancel';
    cancelButton.onclick = () => {
        newRow.remove(); // Remove the row if the user cancels
    };

    actionTd.appendChild(confirmButton);
    actionTd.appendChild(cancelButton);
    newRow.appendChild(actionTd);

    // Append the new row to the table
    table.appendChild(newRow);
}

// Function to edit a row
async function editRow(row, tableName) {
    const table = document.getElementById('dataTable');
    const idField = {
        service: 'service_id',
        transaction: 'transaction_id',
        inventory: 'inventory_id',
    }[tableName];

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
    for (let i = 0; i < rowElement.cells.length - 1; i++) { // Exclude the "Actions" column
        const cell = rowElement.cells[i];
        const columnName = table.rows[0].cells[i].innerText; // Get column name from header
        originalValues[columnName] = cell.innerText;

        if (columnName !== idField) { // Skip the ID column
            const input = document.createElement('input');

            // Apply restrictions based on column name
            if (columnName.toLowerCase().includes('duration')) {
                input.type = 'number'; // Use a number input for duration
                input.min = '0'; // Optional: Set a minimum value
            } else if (
                columnName.toLowerCase().includes('date') ||
                columnName.toLowerCase().includes('time') ||
                columnName.toLowerCase() === 'service_start'
            ) {
                input.type = 'date'; // Use a date picker for date columns
            } else if (columnName.toLowerCase().includes('price')) {
                input.type = 'text'; // Leave price as a text input
            } else {
                input.type = 'text';
            }

            input.value = cell.innerText;
            input.dataset.column = columnName; // Store the column name for later
            cell.innerHTML = '';
            cell.appendChild(input);
        }
    }

    // Replace the "Actions" column with Confirm and Cancel buttons
    const actionsCell = rowElement.cells[rowElement.cells.length - 1];
    const confirmButton = document.createElement('button');
    confirmButton.innerText = 'Confirm';
    confirmButton.onclick = async () => {
        const inputs = rowElement.querySelectorAll('input');
        const updatedRow = { [idField]: rowId }; // Include the ID in the updated data

        inputs.forEach(input => {
            let value = input.value;

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
        for (let i = 0; i < rowElement.cells.length - 1; i++) {
            const cell = rowElement.cells[i];
            const columnName = table.rows[0].cells[i].innerText;
            cell.innerHTML = originalValues[columnName];
        }

        // Restore original "Actions" buttons
        actionsCell.innerHTML = '';
        const editButton = document.createElement('button');
        editButton.innerText = 'Edit';
        editButton.onclick = () => editRow(row, tableName);
        const deleteButton = document.createElement('button');
        deleteButton.innerText = 'Delete';
        deleteButton.onclick = () => deleteRow(row, tableName);
        actionsCell.appendChild(editButton);
        actionsCell.appendChild(deleteButton);
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
