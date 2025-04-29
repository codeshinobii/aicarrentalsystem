// main.js - Main entry point for IntelliRide Frontend Application

import { quantumApiRequest } from './api.js';
import { handleLogin, handleRegister, handleLogout, fetchCurrentUser, getAuthToken, getCurrentUser } from './auth.js';
import { 
    cacheDOMElements, 
    setupThemeToggle, 
    initParticleNetwork, 
    navigateTo, 
    setupNavigation, 
    updateUIAuthState,
    domElements, // Import cached elements
    displayToast, // Needed for generic error handling maybe?
    toggleViewMode, // Import the new function
    setupGradientFollow
} from './ui.js';
import { setupFormValidation } from './utils.js';
import { fetchAndDisplayCars, applyFilters, resetFilters, fetchAndPopulateLocations } from './cars.js';
import { handleUpdateProfile, handleChangePassword, handleAiPrefsUpdate, handlePayment } from './account.js';
// We don't directly call admin functions here, setupAdminDashboard is called via navigation

// --- Initialization Sequence ---

async function initializeApp() {
    console.log("Initializing Quantum Interface Core...");

    // 1. Cache DOM Elements - Essential first step
    cacheDOMElements();
    console.log("DOM Elements Cached.");

    // 2. Setup basic UI elements (Theme, Gradient Follow)
    setupThemeToggle();
    setupGradientFollow();
    // initParticleNetwork(); // COMMENTED OUT to disable background animation
    console.log("UI Enhancements Initialized.");

    // 3. Setup form validation listeners
    setupFormValidation();
    console.log("Form Validation Hooked.");

    // 4. Fetch current user data (if token exists)
    // This also updates UI auth state internally
    try {
        await fetchCurrentUser(); 
    } catch (error) { 
        // Errors are handled within fetchCurrentUser (e.g., logout on 401)
        console.warn("Initial user fetch failed or no token found.");
    }
    console.log("User Session Verified/Initialized.", getCurrentUser());

    // 5. Setup Navigation (attaches listeners to nav buttons etc.)
    // Must happen AFTER initial user fetch to show correct buttons
    await setupNavigation(); // Make sure it's async if it uses await
    console.log("Navigation System Online.");

    // 6. Attach Event Listeners for Forms & Filters
    attachCoreEventListeners();
    console.log("Core Event Listeners Attached.");

    // 7. Initial Navigation & View Setup
    const hash = window.location.hash.substring(1); 
    let initialSection = 'landing'; // << DEFAULT TO LANDING PAGE
    // Added 'landing' to valid sections
    const validSections = ['landing', 'login', 'register', 'cars', 'account', 'admin']; 
    if (hash && validSections.includes(hash)) {
        // Only navigate if user is authorized for the section
        const user = getCurrentUser();
        if (hash === 'account' && !user) {
            initialSection = 'login'; // Redirect to login if trying to access account logged out
            displayToast("Please log in to access your account.", "warning");
        } else if (hash === 'admin' && (!user || user.role !== 'admin')) {
            initialSection = 'cars'; // Redirect to cars if trying to access admin without rights
            displayToast("Admin access required.", "error");
        } else if (hash === 'login' || hash === 'register') {
             initialSection = 'signin'; // Map login/register hash to signin section
        } else if (hash === 'landing') {
            initialSection = 'landing'; // Explicitly handle landing hash
        } else {
            // For hashes like 'cars', 'account', 'admin' (if authorized)
            initialSection = hash;
        }
    }
    
    // Perform initial navigation to load content
    navigateTo(initialSection);
    console.log(`Initial navigation set to: ${initialSection}`);
    
    // Apply stored view mode or default to card (Only relevant if landing directly on cars)
    if (initialSection === 'cars') { 
        const preferredView = localStorage.getItem('intelliride_view_mode') || 'card';
        toggleViewMode(preferredView);
        console.log(`Initial view mode set to: ${preferredView}`);
    }

    console.log("IntelliRide Quantum Interface Initialized Successfully.");
}

// --- Attach Core Event Listeners --- 

function attachCoreEventListeners() {
    // Authentication Forms
    domElements.loginForm?.addEventListener('submit', handleLogin);
    domElements.registerForm?.addEventListener('submit', handleRegister);

    // Car Filters 
    domElements.applyFiltersBtn?.addEventListener('click', applyFilters);
    domElements.resetFiltersBtn?.addEventListener('click', resetFilters);
    
    // View Toggle Buttons
    domElements.viewCardBtn?.addEventListener('click', () => toggleViewMode('card'));
    domElements.viewListBtn?.addEventListener('click', () => toggleViewMode('list'));

    // --- ADD LANDING PAGE BUTTON LISTENERS ---
    domElements.ctaExploreFleet?.addEventListener('click', () => navigateTo('cars'));
    domElements.ctaBrowseNow?.addEventListener('click', () => navigateTo('cars'));
    domElements.ctaSignupLanding?.addEventListener('click', () => {
        navigateTo('signin');
        // Optionally, switch directly to the register tab
        setTimeout(() => toggleAuthForm(true), 50); // Timeout allows section to render first
    });
    // --- END LANDING PAGE LISTENERS ---

    // Main Booking Form Submission (assuming it doesn't navigate away immediately)
    domElements.bookingForm?.addEventListener('submit', handleBookingSubmit); 

    // Account Forms (Profile, Password, AI Prefs)
    domElements.editProfileForm?.addEventListener('submit', handleUpdateProfile);
    domElements.changePasswordForm?.addEventListener('submit', handleChangePassword);
    domElements.aiPreferencesForm?.addEventListener('submit', handleAiPrefsUpdate);

    // Checkout Form
    domElements.checkoutForm?.addEventListener('submit', handlePayment);

    // Global listener for hash changes? (Optional - might conflict with navigateTo)
    // window.addEventListener('hashchange', handleHashChange); 
}

// --- Specific Handlers Residing in main.js (if any) ---

// Example: Handle the main booking form submission (if not moved elsewhere)
async function handleBookingSubmit(event) {
    event.preventDefault();
    console.log("Main booking form submitted...");
    // Ensure utils are imported if needed
    const { clearError, displayError, displaySuccess } = await import('./utils.js');
    
    if (!domElements.bookingCarId || !domElements.bookingStartDate || !domElements.bookingEndDate || !domElements.bookingPickupLocation || !domElements.bookingDropoffLocation || !domElements.bookingError || !domElements.bookingSuccess) {
        console.error("Booking form elements missing.");
        return;
    }
    clearError(domElements.bookingError);
    clearSuccess(domElements.bookingSuccess);

    const bookingData = {
        car: domElements.bookingCarId.value,
        start_date: domElements.bookingStartDate.value,
        end_date: domElements.bookingEndDate.value,
        pickup_location: domElements.bookingPickupLocation.value,
        dropoff_location: domElements.bookingDropoffLocation.value,
    };

    // Add validation (dates are present, end date >= start date, locations selected)
    if (!bookingData.car || !bookingData.start_date || !bookingData.end_date || !bookingData.pickup_location || !bookingData.dropoff_location) {
        displayError(domElements.bookingError, "Please fill all booking details.");
        return;
    }
    if (new Date(bookingData.end_date) < new Date(bookingData.start_date)) {
        displayError(domElements.bookingError, "End date cannot be before start date.");
        return;
    }

    const form = domElements.bookingForm;
    const submitButton = form.querySelector('button[type="submit"]');

    try {
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML += ' <div class="spinner-small"></div>';
        }
        form.classList.add('quantum-submitting');
        
        // API endpoint for creating a booking
        const result = await quantumApiRequest('/bookings', 'POST', bookingData, true, 'booking_request');

        if (result.success && result.data) {
            // Booking successful! What happens next?
            // Option 1: Show success message and navigate to checkout if payment needed
            // Option 2: Show success message and navigate to account bookings
            // Option 3: Just show success message and stay on form?
            const booking = result.data; 
            displaySuccess(domElements.bookingSuccess, `Booking request successful! Ref: ${booking._id}`);
            displayToast('Trajectory Locked! Proceed to payment or view in My Account.', 'success');
            
            // Decide navigation based on booking status (e.g., pending_payment)
            if (booking.status === 'pending_payment') {
                 setTimeout(() => navigateTo('checkout', { booking: booking }), 1500);
            } else {
                // Navigate to account bookings tab
                setTimeout(() => navigateTo('account', { initialTab: 'account-bookings-tab' }), 1500);
            }
             form.reset(); // Clear form on success
        } else {
            displayError(domElements.bookingError, result.message || 'Booking failed.');
        }

    } catch (error) {
         displayError(domElements.bookingError, error.message || 'Booking request failed due to network or server error.');
    } finally {
         if (submitButton) {
            submitButton.disabled = false;
            submitButton.querySelector('.spinner-small')?.remove();
         }
         form.classList.remove('quantum-submitting');
    }
}

// --- Start the App ---
document.addEventListener('DOMContentLoaded', initializeApp); 