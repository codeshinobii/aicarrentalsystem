// auth.js - Handles authentication state and logic

import { quantumApiRequest } from './api.js';
import { displayToast, navigateTo, showLoader, hideLoader, updateUIAuthState, domElements } from './ui.js'; // Import necessary UI functions and DOM elements
import { clearError, displayError, validateEmail } from './utils.js';

// --- State --- 
let authToken = localStorage.getItem('intelliride_token') || null;
let currentUser = null; // Store { name, email, role, _id, preferences, ... }

// --- Getters for state (allow other modules to read state) ---
export function getAuthToken() {
    return authToken;
}

export function getCurrentUser() {
    return currentUser;
}

// --- Authentication Logic ---

/**
 * Handles the login form submission.
 * @param {Event} event - The form submission event.
 */
export async function handleLogin(event) {
    event.preventDefault(); // Prevent default form submission
    
    // Ensure domElements are ready (might need a check or await if cacheDOMElements is async)
    if (!domElements || !domElements.loginEmail) {
        console.error("Login DOM elements not ready.");
        return;
    }
    
    clearError(domElements.loginError);
    const email = domElements.loginEmail.value.trim();
    const password = domElements.loginPassword.value.trim();

    if (!validateEmail(email) || !password) {
        displayError(domElements.loginError, 'Please enter a valid email and password.');
        return;
    }

    const submitButton = domElements.loginForm.querySelector('button[type="submit"]');
    try {
        // Disable button and show spinner manually here
         if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML += ' <div class="spinner-small"></div>';
         }
         domElements.loginForm.classList.add('quantum-submitting');
         
        const data = await quantumApiRequest('/auth/login', 'POST', { email, password }, false, 'login');
        
        if (data.token) {
            authToken = data.token;
            localStorage.setItem('intelliride_token', authToken);
            await fetchCurrentUser(); // Fetch user details after getting token
            
            // Check if fetchCurrentUser was successful before navigating
            if (currentUser) { 
                displayToast('Quantum Signature Verified. Welcome!', 'success');
                navigateTo('cars'); // Navigate AFTER user data is fetched
            } else {
                // Handle case where token is valid but /auth/me fails
                displayError(domElements.loginError, 'Login successful, but failed to retrieve user details.');
                handleLogout(); // Log out user if profile fetch fails
            }
        } else {
             // This case might not be reached if API throws error for non-200
             displayError(domElements.loginError, data.message || 'Login failed. Invalid response.');
        }
    } catch (error) {
        // Display error message from API error object if available
        displayError(domElements.loginError, error.message || 'Login failed due to network or server error.');
        // Ensure auth state is cleared if login fails fundamentally
        handleLogout(); 
    } finally {
         // Re-enable button and remove spinner
         if (submitButton) {
            submitButton.disabled = false;
            submitButton.querySelector('.spinner-small')?.remove();
         }
         domElements.loginForm.classList.remove('quantum-submitting');
    }
}

/**
 * Handles the registration form submission.
 * @param {Event} event - The form submission event.
 */
export async function handleRegister(event) {
     event.preventDefault();
     
     if (!domElements || !domElements.registerName) {
         console.error("Register DOM elements not ready.");
         return;
     }
     
    clearError(domElements.registerError);
    const name = domElements.registerName.value.trim();
    const email = domElements.registerEmail.value.trim();
    const password = domElements.registerPassword.value.trim();

    if (!name || !validateEmail(email) || password.length < 6) {
        displayError(domElements.registerError, 'Please fill all fields correctly (Password min 6 chars).');
        return;
    }

    const submitButton = domElements.registerForm.querySelector('button[type="submit"]');
     try {
         // Disable button and show spinner
          if (submitButton) {
             submitButton.disabled = true;
             submitButton.innerHTML += ' <div class="spinner-small"></div>';
          }
          domElements.registerForm.classList.add('quantum-submitting');
          
         // Register API doesn't usually return a token, just success/failure
         // Assuming the API returns { success: true, message: '...' } on success
        const result = await quantumApiRequest('/auth/register', 'POST', { name, email, password }, false, 'register');
        
         // Check for explicit success flag if backend sends it
         if (result.success) { 
             displayToast('Signature Registered! Please login.', 'success');
             navigateTo('login'); // Switch to login view
             // Optionally auto-fill login form
             if(domElements.loginEmail) domElements.loginEmail.value = email;
             if(domElements.loginPassword) domElements.loginPassword.focus();
         } else {
             // Handle cases where API returns 200 OK but indicates failure
             displayError(domElements.registerError, result.message || 'Registration failed. Please try again.');
         }
    } catch (error) {
         // Display API error message (e.g., email already exists)
         displayError(domElements.registerError, error.message || 'Registration failed due to network or server error.');
    } finally {
          // Re-enable button and remove spinner
          if (submitButton) {
             submitButton.disabled = false;
             submitButton.querySelector('.spinner-small')?.remove();
          }
          domElements.registerForm.classList.remove('quantum-submitting');
    }
}

/**
 * Handles user logout.
 */
export function handleLogout() {
    // Show loader briefly for visual feedback
    showLoader('logout');
    authToken = null;
    currentUser = null;
    localStorage.removeItem('intelliride_token');
    updateUIAuthState(); // Update UI to logged-out state
    navigateTo('cars'); // Go back to public car view
    displayToast('Neural Link Disengaged.', 'info');
    hideLoader(); // Ensure loader hides
}

/**
 * Fetches data for the currently logged-in user using the stored token.
 * Updates the global currentUser state.
 * @returns {Promise<object|null>} The user object or null if fetch fails.
 */
export async function fetchCurrentUser() {
    authToken = localStorage.getItem('intelliride_token') || null; // Ensure token is fresh
    if (!authToken) {
        currentUser = null;
        return null;
    }
    
    try {
        console.log('Attempting to fetch current user...');
        const result = await quantumApiRequest('/auth/me', 'GET', null, true, 'profile_fetch'); // Use loading context
        
        if (!result || !result.success || !result.data) {
            throw new Error(result.message || 'Invalid response structure from /auth/me');
        }

        console.log('Current user data fetched:', result.data);
        currentUser = result.data; // Store user data globally
        updateUIAuthState(); // Update UI based on fetched user
        return currentUser;

    } catch (error) {
        console.error('Failed to fetch current user:', error);
        // If token is invalid (401/403), log out the user
        if (error.statusCode === 401 || error.statusCode === 403) {
             console.log('Auth token invalid or expired. Logging out.');
             handleLogout(); // This will clear state and update UI
        } else {
            // For other errors (network, server issues), show toast but don't log out
            displayToast('Could not verify user session.', 'error');
             currentUser = null; // Clear data but keep token potentially
             updateUIAuthState(); // Update UI to reflect failed fetch
        }
        return null;
    }
} 