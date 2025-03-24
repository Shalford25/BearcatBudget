async function logout() {
    const username = localStorage.getItem('username');
    const sessionId = localStorage.getItem('sessionId');

    if (!username || !sessionId) {
        alert('You are not logged in.');
        window.location.href = '../index.html';
        return;
    }

    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, sessionId }),
        });

        const result = await response.json();
        console.log('Response from /api/logout:', result);

        if (result.success) {
            localStorage.removeItem('username');
            localStorage.removeItem('sessionId');
            alert('You have been logged out.');
            window.location.href = '../index.html';
        } else {
            alert(result.message || 'Failed to log out.');
        }
    } catch (error) {
        console.error('Error during logout:', error);
        alert('An error occurred while logging out. Please try again.');
    }
}