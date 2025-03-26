async function loadAuthButton() {
    const username = localStorage.getItem('username');
    const sessionId = localStorage.getItem('sessionId');
    const authButtonContainer = document.getElementById('auth-button-container');

    if (!authButtonContainer) {
        console.error('auth-button-container element not found in the DOM.');
        return;
    }

    console.log('Username in localStorage:', username); // Debugging
    console.log('Session ID in localStorage:', sessionId); // Debugging

    // Clear any existing content in the container
    authButtonContainer.innerHTML = '';

    if (!username || !sessionId) {
        // User is not logged in, show the Login button
        console.log('User is not logged in. Displaying Login button.'); // Debugging
        const loginButton = document.createElement('input');
        loginButton.type = 'button';
        loginButton.value = 'Login';
        loginButton.onclick = () => {
            window.location.href = 'login.html';
        };
        authButtonContainer.appendChild(loginButton);
    } else {
        // User is logged in, show the Logout button
        console.log('User is logged in. Displaying Logout button.'); // Debugging
        const logoutButton = document.createElement('input');
        logoutButton.type = 'button';
        logoutButton.value = 'Logout';
        logoutButton.onclick = logout;
        authButtonContainer.appendChild(logoutButton);
    }
}

async function logout() {
    const username = localStorage.getItem('username');
    const sessionId = localStorage.getItem('sessionId');

    if (!username || !sessionId) {
        alert('You are not logged in.');
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json', // Ensure the content type is JSON
            },
            body: JSON.stringify({ username, sessionId }), // Send username and sessionId in the body
        });

        if (response.ok) {
            localStorage.removeItem('username');
            localStorage.removeItem('sessionId');
            alert('You have been logged out.');
            window.location.href = 'login.html';
        } else {
            const result = await response.json();
            alert(result.message || 'Failed to log out. Please try again.');
        }
    } catch (error) {
        console.error('Error logging out:', error);
        alert('An error occurred while logging out.');
    }
}

async function routeHome() {
    const username = localStorage.getItem('username');
    const sessionId = localStorage.getItem('sessionId');

    if (!username || !sessionId) {
        // User is not logged in, redirect to index.html
        window.location.href = '../index.html';
        return;
    }

    try {
        // Verify session with the server
        const response = await fetch(`/api/isLoggedIn?username=${encodeURIComponent(username)}&sessionId=${encodeURIComponent(sessionId)}`);
        const result = await response.json();

        if (response.ok && result.success && result.isLoggedIn) {
            // User is logged in, redirect to customerpage.html
            window.location.href = 'customerpage.html';
        } else {
            // Session is invalid, redirect to index.html
            localStorage.removeItem('username');
            localStorage.removeItem('sessionId');
            alert('Your session has expired. Redirecting to login page.');
            window.location.href = '../index.html';
        }
    } catch (error) {
        console.error('Error verifying session:', error);
        alert('An error occurred while verifying your session. Redirecting to login page.');
        window.location.href = '../index.html';
    }
}

// Call loadAuthButton when the page loads
document.addEventListener('DOMContentLoaded', loadAuthButton);