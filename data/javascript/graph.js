// Utility function to format column names
function formatColumnName(columnName) {
    return columnName
        .split('_') // Split the column name by underscores
        .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
        .join(' '); // Join the words with spaces
}

// Fetch graph data from the backend
async function fetchGraphData(tableName) {
    const username = localStorage.getItem('username');
    const sessionId = localStorage.getItem('sessionId');

    if (!username || !sessionId) {
        alert('You are not logged in.');
        window.location.href = 'login.html';
        return [];
    }

    try {
        const response = await fetch(`/api/getGraphData?table=${encodeURIComponent(tableName)}&username=${encodeURIComponent(username)}&sessionId=${encodeURIComponent(sessionId)}`);
        const result = await response.json();

        if (response.ok && result.success) {
            return result.data;
        } else {
            alert(result.message || 'Failed to fetch graph data.');
            return [];
        }
    } catch (error) {
        console.error('Error fetching graph data:', error);
        alert('An error occurred while fetching graph data.');
        return [];
    }
}

// Render Service Prices Graph
async function renderServicePrices() {
    const graphData = await fetchGraphData('service');

    if (graphData.length === 0) {
        console.error('No data available for Service Prices graph.');
        return;
    }

    const labels = graphData.map(row => formatColumnName(row.service_name)); // Format column names
    const values = graphData.map(row => row.service_price);

    const ctx = document.getElementById('servicePricesChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Service Prices',
                data: values,
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Render Transaction Amounts by Type Graph
async function renderTransactionTypes() {
    const graphData = await fetchGraphData('transaction');

    if (graphData.length === 0) {
        console.error('No data available for Transaction Types graph.');
        return;
    }

    const labels = graphData.map(row => row.transaction_type);
    const values = graphData.map(row => row.transaction_amount);

    const ctx = document.getElementById('transactionTypesChart').getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                label: 'Transaction Amounts by Type',
                data: values,
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
            }]
        },
        options: {
            responsive: true
        }
    });
}

// Render Inventory Stock Levels Graph
async function renderInventoryStock() {
    const graphData = await fetchGraphData('inventory');

    if (graphData.length === 0) {
        console.error('No data available for Inventory Stock Levels graph.');
        return;
    }

    const labels = graphData.map(row => row.item_name);
    const values = graphData.map(row => row.quantity);

    const ctx = document.getElementById('inventoryStockChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Stock Levels',
                data: values,
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Render Revenue by Service Graph
async function renderRevenueByService() {
    const graphData = await fetchGraphData('transaction');

    if (graphData.length === 0) {
        console.error('No data available for Revenue by Service graph.');
        return;
    }

    // Group data by service and calculate total revenue
    const revenueByService = {};
    graphData.forEach(row => {
        if (row.transaction_type === 'sale') {
            revenueByService[row.service_name] = (revenueByService[row.service_name] || 0) + row.transaction_amount;
        }
    });

    const labels = Object.keys(revenueByService);
    const values = Object.values(revenueByService);

    const ctx = document.getElementById('revenueByServiceChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Revenue by Service',
                data: values,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Render Transactions Over Time Graph
async function renderTransactionsOverTime() {
    const graphData = await fetchGraphData('transaction');

    if (graphData.length === 0) {
        console.error('No data available for Transactions Over Time graph.');
        return;
    }

    const transactionsByDate = {};
    graphData.forEach(row => {
        const date = new Date(row.transaction_date).toISOString().split('T')[0];
        transactionsByDate[date] = (transactionsByDate[date] || 0) + row.transaction_amount;
    });

    const labels = Object.keys(transactionsByDate).sort();
    const values = labels.map(date => transactionsByDate[date]);

    const ctx = document.getElementById('transactionsOverTimeChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.map(label => formatColumnName(label)), // Format column names
            datasets: [{
                label: 'Transactions Over Time',
                data: values,
                backgroundColor: 'rgba(153, 102, 255, 0.2)',
                borderColor: 'rgba(153, 102, 255, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Render Inventory Value by Item Graph
async function renderInventoryValue() {
    const graphData = await fetchGraphData('inventory');

    if (graphData.length === 0) {
        console.error('No data available for Inventory Value by Item graph.');
        return;
    }

    // Calculate inventory value for each item
    const labels = graphData.map(row => row.item_name);
    const values = graphData.map(row => row.quantity * row.unit_price);

    const ctx = document.getElementById('inventoryValueChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Inventory Value by Item',
                data: values,
                backgroundColor: 'rgba(255, 159, 64, 0.2)',
                borderColor: 'rgba(255, 159, 64, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Automatically render all graphs when the page loads
document.addEventListener('DOMContentLoaded', () => {
    renderServicePrices();
    renderTransactionTypes();
    renderInventoryStock();
    renderRevenueByService();
    renderTransactionsOverTime();
    renderInventoryValue();
});