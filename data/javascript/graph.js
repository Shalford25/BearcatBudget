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

// Render Transactions Over Time Graph
async function renderTransactionsOverTime() {
    const graphData = await fetchGraphData('transaction');

    if (graphData.length === 0) {
        console.error('No data available for Transactions Over Time graph.');
        return;
    }

    // Group data by date and calculate total transaction amounts
    const transactionsByDate = {};
    graphData.forEach(row => {
        if (row.transaction_date && row.transaction_amount) {
            const date = new Date(row.transaction_date).toISOString().split('T')[0]; // Format as YYYY-MM-DD
            transactionsByDate[date] = (transactionsByDate[date] || 0) + row.transaction_amount;
        }
    });

    const labels = Object.keys(transactionsByDate).sort(); // Sort dates
    const values = labels.map(date => transactionsByDate[date]);

    const ctx = document.getElementById('transactionsOverTimeChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
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

// Render Services Over Time Graph
async function renderServicesOverTime() {
    const graphData = await fetchGraphData('service');

    if (graphData.length === 0) {
        console.error('No data available for Services Over Time graph.');
        return;
    }

    // Track active services by date
    const servicesByDate = {};
    graphData.forEach(row => {
        if (row.service_start && row.service_duration) {
            const startDate = new Date(row.service_start);
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + row.service_duration); // Add duration to start date

            // Increment the count for each date the service is active
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const formattedDate = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
                servicesByDate[formattedDate] = (servicesByDate[formattedDate] || 0) + 1;
            }
        }
    });

    const labels = Object.keys(servicesByDate).sort(); // Sort dates
    const values = labels.map(date => servicesByDate[date]);

    const canvas = document.getElementById('servicesOverTimeChart');
    if (!canvas) {
        console.error('Canvas element for Services Over Time graph not found.');
        return;
    }
    const ctx = canvas.getContext('2d');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Active Services Over Time',
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

// Automatically render all graphs when the page loads
document.addEventListener('DOMContentLoaded', () => {
    renderServicePrices();
    renderTransactionTypes();
    renderInventoryStock();
    renderTransactionsOverTime();
    renderInventoryValue();
    renderServicesOverTime();
});