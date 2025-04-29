// api.js - Handles communication with the backend API

// Import dependencies (will be created later)
import { showLoader, hideLoader, displayToast } from './ui.js';
import { getAuthToken } from './auth.js'; // Assume auth.js exports a getter for the token

export const API_BASE_URL = 'http://localhost:5000/api/v1'; 

/**
 * Makes an authenticated API request with loading indicators and error handling.
 * @param {string} endpoint - The API endpoint (e.g., '/cars', '/auth/login').
 * @param {string} [method='GET'] - HTTP method (GET, POST, PUT, DELETE).
 * @param {object|null} [body=null] - Request body for POST/PUT.
 * @param {boolean} [requiresAuth=true] - Does the request require an Authorization header?
 * @param {string} [loadingContext=''] - Context string for the loading message.
 * @returns {Promise<object|string>} - The parsed JSON response data or response text if not JSON.
 * @throws {Error} - Throws an error if the request fails or the response is not ok.
 */
export async function quantumApiRequest(endpoint, method = 'GET', body = null, requiresAuth = true, loadingContext = '') {
    showLoader(loadingContext || method.toLowerCase()); // Provide context

    // Add a slight delay for loader visibility
    await new Promise(resolve => setTimeout(resolve, 50));

    const headers = {
        'Content-Type': 'application/json',
    };
    
    const token = getAuthToken(); // Get token via exported function
    if (requiresAuth && token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : null
        });

        const responseBody = await response.text(); // Read body as text first
        let data = {};

        try {
            data = responseBody ? JSON.parse(responseBody) : {}; // Parse JSON only if body exists
        } catch (e) {
            if (!response.ok) {
                 throw new Error(responseBody || `Server responded with status ${response.status}`);
            }
             console.warn(`API response for ${method} ${endpoint} was not valid JSON:`, responseBody);
             return responseBody; // Return raw text if OK but not JSON
        }

        if (!response.ok) {
            const errorMessage = data.error || data.message || `Request failed: ${response.statusText} (${response.status})`;
             console.error(`API Error (${method} ${endpoint}):`, response.status, errorMessage, data);
            // Throw an error object that includes the status code and potentially the backend error data
             const error = new Error(errorMessage);
             error.statusCode = response.status;
             error.data = data; // Attach full error response data
             throw error;
        }

        return data; // Return parsed JSON data

    } catch (error) {
         console.error(`Quantum API Disruption (${method} ${endpoint}):`, error);
         // Display a generic toast for network/parsing errors, but rely on specific handlers for API errors (like 401, 403, 400)
         // Only show toast here if it's likely a network issue (e.g., error doesn't have statusCode)
         if (!error.statusCode) { 
             displayToast(`${error.message || 'Network error or server unreachable.'}`, 'error');
         }
        throw error; // Re-throw the error so calling function can handle it specifically
    } finally {
        hideLoader();
    }
} 