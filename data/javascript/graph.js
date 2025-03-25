// Fetch graph data from the backend
async function fetchGraphData(tableName) {
    const username = localStorage.getItem('username');
    const sessionId = localStorage.getItem('sessionId');

    if (!username || !sessionId) {
        alert('You are not logged in.');
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`/api/getGraphData?table=${encodeURIComponent(tableName)}&username=${encodeURIComponent(username)}&sessionId=${encodeURIComponent(sessionId)}`);
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

// Render the graph using Chart.js
async function renderGraph() {
    const tableName = 'transaction'; // Replace with the table you want to graph
    const graphData = await fetchGraphData(tableName);

    if (graphData.length === 0) {
        console.error('No data available for the graph.');
        return;
    }

    // Prepare data for the chart
    const labels = graphData.map(row => row.date || row.name); // Replace with the appropriate column
    const values = graphData.map(row => row.amount || row.value); // Replace with the appropriate column

    // Create the chart
    const ctx = document.getElementById('myChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar', // Change to 'line', 'pie', etc., as needed
        data: {
            labels: labels,
            datasets: [{
                label: 'Transaction Amounts', // Replace with your label
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

// Automatically render the graph when the page loads
document.addEventListener('DOMContentLoaded', renderGraph);