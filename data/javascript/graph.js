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
        // Ensure the table name is passed as a query parameter
        const endpoint = `/api/getGraphData?table=${encodeURIComponent(tableName)}&username=${encodeURIComponent(username)}&sessionId=${encodeURIComponent(sessionId)}`;
        const response = await fetch(endpoint);
        const result = await response.json();

        if (response.ok && result.success) {
            return result.data; // Return the data for the graph
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

    const labels = graphData.map(row => row.service_name);
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

// Automatically render all graphs when the page loads
document.addEventListener('DOMContentLoaded', () => {
    renderServicePrices();
    renderTransactionTypes();
    renderInventoryStock();
});