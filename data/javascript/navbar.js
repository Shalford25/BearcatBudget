async function loadAuthButton() {
    const username = localStorage.getItem('username') || getCookie('username');
    const sessionId = localStorage.getItem('sessionId') || getCookie('sessionId');
    const authButtonContainer = document.getElementById('auth-button-container');

    if (!authButtonContainer) {
        console.error('auth-button-container element not found in the DOM.');
        return;
    }

    console.log('Username in localStorage or cookies:', username);
    console.log('Session ID in localStorage or cookies:', sessionId);

    // Clear any existing content in the container
    authButtonContainer.innerHTML = '';

    if (!username || !sessionId) {
        // User is not logged in, show the Login button
        console.log('User is not logged in. Displaying Login button.');
        const loginButton = document.createElement('input');
        loginButton.type = 'button';
        loginButton.value = 'Login';
        loginButton.onclick = () => {
            window.location.href = 'login.html';
        };
        authButtonContainer.appendChild(loginButton);
    } else {
        // User is logged in, show the Logout button
        console.log('User is logged in. Displaying Logout button.');
        const logoutButton = document.createElement('input');
        logoutButton.type = 'button';
        logoutButton.value = 'Logout';
        logoutButton.onclick = logout;
        authButtonContainer.appendChild(logoutButton);
    }
}

// Helper function to get a cookie value by name
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
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
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, sessionId }),
        });

        if (response.ok) {
            // Clear localStorage
            localStorage.removeItem('username');
            localStorage.removeItem('sessionId');

            // Clear cookies
            document.cookie = 'sessionId=; path=/; max-age=0;';
            document.cookie = 'username=; path=/; max-age=0;';

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