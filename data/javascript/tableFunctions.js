// Function to fetch and display table data
async function displayTable(tableName) {
    try {
        const response = await fetch(`/api/getTableData?table=${encodeURIComponent(tableName)}`);
        const data = await response.json();

        if (response.ok) {
            const table = document.getElementById('dataTable');
            table.innerHTML = ''; // Clear existing table data

            // Create table headers
            const headerRow = document.createElement('tr');
            Object.keys(data[0]).forEach(key => {
                const th = document.createElement('th');
                th.innerText = key;
                headerRow.appendChild(th);
            });

            // Add action column for editing/deleting rows
            const actionTh = document.createElement('th');
            actionTh.innerText = 'Actions';
            headerRow.appendChild(actionTh);

            table.appendChild(headerRow);

            // Create table rows
            data.forEach(row => {
                const tr = document.createElement('tr');
                Object.values(row).forEach(value => {
                    const td = document.createElement('td');
                    td.innerText = value;
                    tr.appendChild(td);
                });

                // Add edit and delete buttons
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

                table.appendChild(tr);
            });

            // Add a row for adding new data
            const addRow = document.createElement('tr');
            const addButton = document.createElement('button');
            addButton.innerText = 'Add Row';
            addButton.onclick = () => addRowToTable(tableName);
            const addTd = document.createElement('td');
            addTd.colSpan = Object.keys(data[0]).length + 1; // Span all columns
            addTd.appendChild(addButton);
            addRow.appendChild(addTd);
            table.appendChild(addRow);
        } else {
            alert(data.message || 'Failed to fetch table data.');
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
        input.type = 'text';
        input.placeholder = `Enter value for ${headers[i]}`;
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

    const editableRow = { ...row };
    delete editableRow[idField]; // Exclude the "id" field from being edited

    const updatedRow = prompt('Edit row data (JSON format):', JSON.stringify(editableRow));
    if (updatedRow) {
        try {
            console.log('Sending edit request:', {
                table: tableName,
                row: { ...JSON.parse(updatedRow), id: row[idField] },
            });

            const response = await fetch('/api/editRow', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    table: tableName,
                    row: { ...JSON.parse(updatedRow), id: row[idField] },
                    username,
                    sessionId,
                }),
            });
            const result = await response.json();
            if (result.success) {
                alert('Row updated successfully!');
                displayTable(tableName); // Refresh the table
            } else if (response.status === 403) {
                alert('You do not have permission to edit rows.');
            } else {
                alert(result.message || 'Failed to update row.');
            }
        } catch (error) {
            console.error('Error updating row:', error);
            alert('An error occurred while updating the row.');
        }
    }
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
