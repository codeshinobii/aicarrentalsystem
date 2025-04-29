// account.js - Handles user account section logic (profile, bookings, AI prefs, checkout)

import { quantumApiRequest } from './api.js';
import { domElements, navigateTo, switchAccountTab, displayToast } from './ui.js';
import { getCurrentUser } from './auth.js';
import { formatDate, clearError, displayError, displaySuccess, clearSuccess, disableForm } from './utils.js';
import { populateLocationDropdowns, formatCurrency } from './cars.js'; // Needed for booking form inside account?

// --- Account Page Setup ---

/**
 * Initializes the account page, sets up common elements, and switches to the initial tab.
 * @param {string} [initialTab='account-bookings-tab'] - The ID of the tab to display first.
 */
export function setupAccountPage(initialTab = 'account-bookings-tab') {
    const user = getCurrentUser();
    if (!user) {
        console.error("Cannot setup account page: No user logged in.");
        navigateTo('login'); // Redirect if somehow accessed without user
        return; 
    } 
    
    if (!domElements.accountGreeting || !domElements.userDisplayName || !domElements.userEmail) {
        console.error("Account page DOM elements missing from cache.");
        return;
    }

    domElements.accountGreeting.innerHTML = `Welcome back, <strong class="hover-effect">${user.name}</strong>!`;
    domElements.userDisplayName.textContent = user.name;
    domElements.userEmail.textContent = user.email;
    
    // Setup tab navigation listeners specific to the account page
    domElements.accountNavBtns?.forEach(btn => {
        // Remove potentially old listeners if setupAccountPage is called multiple times?
        // Consider a more robust way to handle listener attachment/detachment if needed.
        btn.replaceWith(btn.cloneNode(true)); // Simple way to remove old listeners
        const newBtn = document.querySelector(`.account-nav-btn[data-tab="${btn.dataset.tab}"]`); // Re-select the cloned button
        newBtn?.addEventListener('click', () => {
            const tabId = newBtn.dataset.tab;
            switchAccountTab(tabId); // switchAccountTab is imported from ui.js
        });
    });

    // Set initial tab
    switchAccountTab(initialTab);
}

// --- Bookings Tab --- 

/**
 * Fetches and displays the current user's bookings (upcoming and past).
 */
export async function fetchAndDisplayUserBookings() {
    if (!domElements.upcomingBookingsList || !domElements.pastBookingsList || !domElements.bookingSnapshotContent) {
        console.error("Booking list/snapshot elements not found in cache.");
        return;
    }
    domElements.upcomingBookingsList.innerHTML = `<div class="loading-placeholder"><div class="spinner-small"></div> Loading upcoming...</div>`;
    domElements.pastBookingsList.innerHTML = `<div class="loading-placeholder"><div class="spinner-small"></div> Loading past...</div>`;
     domElements.bookingSnapshotContent.innerHTML = `Scanning timelines... <div class="spinner-small"></div>`;

    try {
        const result = await quantumApiRequest('/bookings', 'GET', null, true, 'profile_fetch'); 
        const bookings = result.data || []; 
        
        const now = new Date();
        // Ensure dates are compared correctly
        const upcoming = bookings.filter(b => new Date(b.end_date) >= now && b.status !== 'completed' && b.status !== 'cancelled');
        const past = bookings.filter(b => new Date(b.end_date) < now || b.status === 'completed' || b.status === 'cancelled');

        renderBookingList(domElements.upcomingBookingsList, upcoming, 'upcoming');
        renderBookingList(domElements.pastBookingsList, past, 'past');

        // Update snapshot
        const nextBooking = [...upcoming].sort((a, b) => new Date(a.start_date) - new Date(b.start_date))[0]; // Sort a copy
        if (nextBooking) {
             const statusClass = nextBooking.status ?? 'unknown';
             const statusText = nextBooking.status?.replace('_', ' ') ?? 'Unknown';
             const carName = `${nextBooking.car?.make || ''} ${nextBooking.car?.model || 'Vehicle'}`.trim();
             domElements.bookingSnapshotContent.innerHTML = `
                <strong>${carName || 'Vehicle Details Missing'}</strong><br>
                From: ${formatDate(nextBooking.start_date)}<br>
                To: ${formatDate(nextBooking.end_date)}<br>
                Status: <span class="status-badge status-${statusClass}">${statusText}</span>
            `;
        } else {
            domElements.bookingSnapshotContent.textContent = 'No upcoming trajectories scheduled.';
        }

    } catch (error) {
        console.error("Failed to fetch user bookings:", error);
        if(domElements.upcomingBookingsList) domElements.upcomingBookingsList.innerHTML = `<p class="error-message show">Could not load bookings: ${error.message}</p>`;
        if(domElements.pastBookingsList) domElements.pastBookingsList.innerHTML = '';
        if(domElements.bookingSnapshotContent) domElements.bookingSnapshotContent.textContent = 'Error loading data.';
    }
}

/**
 * Renders a list of booking cards into a specified container.
 * @param {HTMLElement} element - The container element to render into.
 * @param {object[]} bookings - Array of booking objects.
 * @param {string} type - 'upcoming' or 'past' (used for empty message).
 */
function renderBookingList(element, bookings, type) { // Keep private to this module
     if (!element) return;
    if (bookings.length === 0) {
        element.innerHTML = `<p>No ${type} bookings found.</p>`;
        return;
    }
     
     element.innerHTML = bookings.map((booking, index) => {
         const statusClass = booking.status ?? 'unknown';
         const statusText = booking.status?.replace('_', ' ') ?? 'Unknown';
         const carName = `${booking.car?.year || ''} ${booking.car?.make || 'Unknown'} ${booking.car?.model || 'Vehicle'}`.trim();
         const carImage = booking.car?.imageUrls?.[0] || 'images/quantum-car-placeholder.png';
         
         return `
        <div class="booking-card glass-card hover-effect animate__animated animate__fadeIn" style="animation-delay: ${index * 0.05}s">
            <div class="booking-card-header">
                <h4>${carName || 'Vehicle Details Missing'}</h4>
                <span class="status-badge status-${statusClass}">${statusText}</span>
            </div>
            <img src="${carImage}" alt="Car image" class="booking-card-image" loading="lazy" onerror="this.onerror=null; this.src='images/quantum-car-placeholder.png';">
            <div class="booking-card-body">
                <p><strong>Ref:</strong> ${booking._id}</p>
                <p><i class="fas fa-calendar-alt"></i> ${formatDate(booking.start_date)} - ${formatDate(booking.end_date)}</p>
                <p><i class="fas fa-map-marker-alt"></i> Pickup: ${booking.pickup_location?.city || 'N/A'}</p>
                 <p><i class="fas fa-dollar-sign"></i> Cost: $${booking.total_cost?.toFixed(2) || 'N/A'}</p>
            </div>
             ${booking.status === 'pending_payment' ? 
               `<div class="booking-card-footer"><button class="btn btn-primary btn-small pay-now-btn" data-booking-id="${booking._id}">Pay Now</button></div>` : ''}
             ${booking.status === 'confirmed' ? 
               `<div class="booking-card-footer"><button class="btn btn-secondary btn-small cancel-booking-user-btn" data-booking-id="${booking._id}">Cancel Booking</button></div>` : ''}
        </div>
    `}).join('');

     // Add listeners AFTER rendering
     element.querySelectorAll('.pay-now-btn').forEach(btn => {
         btn.addEventListener('click', (e) => {
             const bookingId = e.currentTarget.dataset.bookingId;
             const bookingToPay = bookings.find(b => b._id === bookingId);
             if (bookingToPay) {
                 navigateTo('checkout', { booking: bookingToPay });
             }
         });
     });
     element.querySelectorAll('.cancel-booking-user-btn').forEach(btn => {
         btn.addEventListener('click', handleUserCancelBooking);
     });
}

/**
 * Handles the user cancelling their own confirmed booking.
 * @param {Event} event 
 */
async function handleUserCancelBooking(event) { // Keep private
    const bookingId = event.currentTarget.dataset.bookingId;
    if (!bookingId) return;

    if (confirm('Are you sure you want to cancel this booking?')) {
        try {
            // Backend endpoint might need adjustment - check API definition
            const result = await quantumApiRequest(`/bookings/${bookingId}/cancel`, 'PUT', null, true, 'booking_cancel');
             displayToast(result.message || 'Booking cancelled successfully.', 'success');
             fetchAndDisplayUserBookings(); // Refresh list after cancellation
        } catch (error) {
             displayToast(error.message || 'Failed to cancel booking.', 'error');
        }
    }
}


// --- Profile Tab --- 

/**
 * Populates the profile edit form with current user data.
 */
export function populateProfileForm() {
    const user = getCurrentUser();
    if (!user || !domElements.editProfileForm || !domElements.profileName || !domElements.profileEmail) {
        console.error("Cannot populate profile form: User data or DOM elements missing.");
        return; 
    }
    domElements.profileName.value = user.name || '';
    domElements.profileEmail.value = user.email || '';
    if(domElements.editProfileError) clearError(domElements.editProfileError);
    if(domElements.editProfileSuccess) clearSuccess(domElements.editProfileSuccess);
}

/**
 * Handles submission of the profile update form.
 * @param {Event} event 
 */
export async function handleUpdateProfile(event) {
    event.preventDefault(); 
    
    if (!domElements.editProfileForm || !domElements.profileName || !domElements.profileEmail || !domElements.editProfileError) {
        console.error("Profile update form elements missing.");
        return;
    }
    
    const form = domElements.editProfileForm;
    const submitButton = form.querySelector('button[type="submit"]');
    clearError(domElements.editProfileError);
    clearSuccess(domElements.editProfileSuccess);

    const name = domElements.profileName.value.trim();
    const email = domElements.profileEmail.value.trim();

    if (!name || !email) {
        displayError(domElements.editProfileError, 'Name and Email are required.');
        return; 
    }

    try {
         if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML += ' <div class="spinner-small"></div>';
         }
         form.classList.add('quantum-submitting');
         
        const result = await quantumApiRequest('/auth/updatedetails', 'PUT', { name, email }, true, 'profile_update');

        if (result.success && result.data) {
            // Update local currentUser object (assuming auth.js doesn't automatically refetch)
            const currentUser = getCurrentUser();
            if (currentUser) {
                 currentUser.name = result.data.name;
                 currentUser.email = result.data.email;
                 // Re-populate form and sidebar display after successful update
                 populateProfileForm(); 
                 if (domElements.userDisplayName) domElements.userDisplayName.textContent = currentUser.name;
                 if (domElements.userEmail) domElements.userEmail.textContent = currentUser.email;
                 if (domElements.userGreeting) domElements.userGreeting.innerHTML = `Welcome, <strong class="hover-effect">${currentUser.name.split(' ')[0]}</strong>!`;
            }
            displaySuccess(domElements.editProfileSuccess, 'Profile updated successfully!');
        } else {
            displayError(domElements.editProfileError, result.message || 'Failed to update profile.');
        }

    } catch (error) {
        displayError(domElements.editProfileError, error.message || 'Profile update failed.');
    } finally {
         if (submitButton) {
            submitButton.disabled = false;
            submitButton.querySelector('.spinner-small')?.remove();
         }
         form.classList.remove('quantum-submitting');
    }
}

/**
 * Handles submission of the change password form.
 * @param {Event} event 
 */
export async function handleChangePassword(event) {
    event.preventDefault();
    
    if (!domElements.changePasswordForm || !domElements.currentPassword || !domElements.newPassword || !domElements.confirmPassword || !domElements.changePasswordError) {
        console.error("Change password form elements missing.");
        return;
    }
    
    const form = domElements.changePasswordForm;
    const submitButton = form.querySelector('button[type="submit"]');
    clearError(domElements.changePasswordError);
    clearSuccess(domElements.changePasswordSuccess);

    const currentPassword = domElements.currentPassword.value;
    const newPassword = domElements.newPassword.value;
    const confirmPassword = domElements.confirmPassword.value;

    // Basic validation (also handled by validateInput, but good to double-check)
    if (!currentPassword || !newPassword || !confirmPassword) {
        displayError(domElements.changePasswordError, 'All password fields are required.');
        return;
    }
    if (newPassword.length < 6) {
         displayError(domElements.changePasswordError, 'New password must be at least 6 characters.');
        return;
    }
     if (newPassword !== confirmPassword) {
        displayError(domElements.changePasswordError, 'New passwords do not match.');
        return;
    }

    try {
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML += ' <div class="spinner-small"></div>';
         }
         form.classList.add('quantum-submitting');
         
        // Endpoint for password change
        const result = await quantumApiRequest('/auth/updatepassword', 'PUT', {
            currentPassword: currentPassword,
            newPassword: newPassword
        }, true, 'profile_update'); // Use same loading context maybe?

        if (result.success) {
            displaySuccess(domElements.changePasswordSuccess, 'Password changed successfully!');
            form.reset(); // Clear password fields after success
            // Optionally display a toast as well
            displayToast('Password updated.', 'success');
        } else {
            // API returned OK but success: false
            displayError(domElements.changePasswordError, result.message || 'Failed to change password.');
        }
    } catch (error) {
        // Handle API errors (like incorrect current password - 401)
        displayError(domElements.changePasswordError, error.message || 'Password change failed.');
    } finally {
         if (submitButton) {
            submitButton.disabled = false;
            submitButton.querySelector('.spinner-small')?.remove();
         }
          form.classList.remove('quantum-submitting');
    }
}

// --- AI Preferences Tab ---

/**
 * Populates the AI preferences form with current user data.
 */
export function populateAiPreferencesForm() {
    const user = getCurrentUser();
     if (!user || !domElements.aiPreferencesForm || !domElements.aiPrefPassengers || !domElements.aiPrefCarType || !domElements.aiPrefUseCase || !domElements.aiPrefFuelPref) {
         console.error("Cannot populate AI prefs form: User data or DOM elements missing.");
         return;
     }
    const prefs = user.aiPreferences || {}; // Get prefs or empty object
    domElements.aiPrefPassengers.value = prefs.defaultPassengers ?? ''; // Use nullish coalescing
    domElements.aiPrefCarType.value = prefs.preferredCarType ?? '';
    domElements.aiPrefUseCase.value = prefs.typicalUseCase ?? '';
    domElements.aiPrefFuelPref.value = prefs.fuelPreference ?? '';
    
    if(domElements.aiPrefsError) clearError(domElements.aiPrefsError);
    if(domElements.aiPrefsSuccess) clearSuccess(domElements.aiPrefsSuccess);
}

/**
 * Handles submission of the AI preferences form.
 * @param {Event} event 
 */
export async function handleAiPrefsUpdate(event) {
    event.preventDefault();
    
    if (!domElements.aiPreferencesForm || !domElements.aiPrefPassengers || !domElements.aiPrefCarType || !domElements.aiPrefUseCase || !domElements.aiPrefFuelPref || !domElements.aiPrefsError) {
         console.error("AI Prefs form elements missing.");
         return;
    }
    
    const form = domElements.aiPreferencesForm;
    const submitButton = form.querySelector('button[type="submit"]');
    clearError(domElements.aiPrefsError);
    clearSuccess(domElements.aiPrefsSuccess);

    const user = getCurrentUser();
    if (!user) {
         displayError(domElements.aiPrefsError, 'Authentication error. Please login again.');
         return;
    }

    const preferences = {
        defaultPassengers: domElements.aiPrefPassengers.value ? parseInt(domElements.aiPrefPassengers.value, 10) : null,
        preferredCarType: domElements.aiPrefCarType.value || null,
        typicalUseCase: domElements.aiPrefUseCase.value || null,
        fuelPreference: domElements.aiPrefFuelPref.value || null,
    };

    // Filter out null values before sending to backend if backend expects only set fields
    // Or send all fields and let backend handle nulls (depends on API design)
    const validPreferences = Object.entries(preferences)
        .filter(([key, value]) => value !== null) // Only filter null, allow empty string if needed by backend?
        .reduce((obj, [key, value]) => {
            obj[key] = value;
            return obj;
        }, {});
        
    // Construct payload expected by backend (e.g., { aiPreferences: {...} })
    const payload = { aiPreferences: validPreferences };

    try {
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML += ' <div class="spinner-small"></div>';
         }
         form.classList.add('quantum-submitting');
         
        // --- Check Backend Endpoint --- 
        // Assuming endpoint is PUT /api/v1/auth/updatedetails for consistency?
        // Or a dedicated one like PUT /api/v1/users/me/preferences ? -> Check API routes!
        // Let's assume it's part of updatedetails for now, needs confirmation.
        // This needs adjustment based on the actual backend route.
        // Using a placeholder endpoint:
        const result = await quantumApiRequest('/auth/preferences', 'PUT', payload, true, 'profile_update'); // <<-- NEEDS CORRECT ENDPOINT

        if (result.success && result.data) {
            displaySuccess(domElements.aiPrefsSuccess, 'AI Preferences updated successfully!');
            // Update local currentUser object
            if (user) {
                user.aiPreferences = result.data.aiPreferences; // Assuming API returns updated user or preferences
                populateAiPreferencesForm(); // Re-populate form to reflect saved state
            }
        } else {
            displayError(domElements.aiPrefsError, result.message || 'Failed to update preferences.');
        }
    } catch (error) {
         displayError(domElements.aiPrefsError, error.message || 'Failed to save preferences.');
    } finally {
         if (submitButton) {
            submitButton.disabled = false;
            submitButton.querySelector('.spinner-small')?.remove();
         }
         form.classList.remove('quantum-submitting');
    }
}

// --- Checkout Logic ---
// Moved here as it's closely related to user bookings

/**
 * Sets up the checkout page with details from the selected booking.
 * @param {object} booking - The booking object.
 */
export function setupCheckoutPage(booking) {
    if (!booking || !domElements.checkoutSection || !domElements.checkoutBookingId || !domElements.checkoutBookingRef || !domElements.checkoutCarDetails || !domElements.checkoutBookingDates || !domElements.checkoutBookingCost || !domElements.checkoutForm || !domElements.checkoutError || !domElements.checkoutSuccess || !domElements.cancelCheckoutBtn) {
        console.error("Checkout page elements missing from cache.");
        navigateTo('cars'); // Fallback if essential elements are missing
        return;
    }

    domElements.checkoutBookingId.value = booking._id;
    domElements.checkoutBookingRef.textContent = booking._id;
    
    // Safely access nested car properties
    const car = booking.car; 
    domElements.checkoutCarDetails.textContent = car ? `${car.year || ''} ${car.make || ''} ${car.model || 'Vehicle'}`.trim() : 'Vehicle details unavailable';
    domElements.checkoutBookingDates.textContent = `${formatDate(booking.start_date)} to ${formatDate(booking.end_date)}`;
    if (domElements.checkoutBookingCost && booking.total_cost) {
        domElements.checkoutBookingCost.textContent = formatCurrency(booking.total_cost, 'TZS');
    }

    // Reset form and messages
    domElements.checkoutForm.reset();
    clearError(domElements.checkoutError);
    clearSuccess(domElements.checkoutSuccess);
    
    // Ensure submit button is enabled and cancel button has correct text/action
    const submitBtn = domElements.checkoutForm.querySelector('button[type="submit"]');
    if(submitBtn) submitBtn.disabled = false;
    domElements.cancelCheckoutBtn.textContent = 'Abort';
    // Re-attach listener if needed, or ensure it wasn't removed
    // domElements.cancelCheckoutBtn.onclick = () => navigateTo('account'); 
}

/**
 * Handles the (simulated) payment form submission.
 * @param {Event} event 
 */
export async function handlePayment(event) {
    event.preventDefault();
    
    if (!domElements.checkoutForm || !domElements.checkoutBookingId || !domElements.checkoutError || !domElements.checkoutSuccess || !domElements.cancelCheckoutBtn) {
        console.error("Checkout payment form elements missing.");
        return;
    }
    
    clearError(domElements.checkoutError);
    clearSuccess(domElements.checkoutSuccess);

    const bookingId = domElements.checkoutBookingId.value;
    const form = domElements.checkoutForm;
    const submitButton = form.querySelector('button[type="submit"]');
    
    // Simulate payment details 
    const paymentData = {
        bookingId: bookingId,
        paymentMethod: 'simulated_card_token',
        // Only include simulated details if absolutely needed for backend test endpoint
        // cardNumber: document.getElementById('card-number')?.value, 
        // expiryDate: document.getElementById('expiry-date')?.value, 
        // cvc: document.getElementById('cvc')?.value, 
    };

     // Basic validation for simulation inputs if they exist
     const cardNumberInput = document.getElementById('card-number');
     const expiryDateInput = document.getElementById('expiry-date');
     const cvcInput = document.getElementById('cvc');
     if (cardNumberInput && expiryDateInput && cvcInput && (!cardNumberInput.value || !expiryDateInput.value || !cvcInput.value)) {
         displayError(domElements.checkoutError, 'Please enter simulated card details.');
         return;
     }

    try {
         if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML += ' <div class="spinner-small"></div>';
         }
         form.classList.add('quantum-submitting');
         
        // --- Check Backend Endpoint --- 
        // Should be something like /bookings/:id/confirm-payment
        const result = await quantumApiRequest(`/bookings/${bookingId}/confirm-payment`, 'POST', paymentData, true, 'payment');

        if (result.success) { // Assuming success: true is returned on success
            displaySuccess(domElements.checkoutSuccess, 'Quantum Transaction Complete! Your trajectory is locked.');
             displayToast('Payment Successful! Booking Confirmed.', 'success');
             disableForm(domElements.checkoutForm);
             domElements.cancelCheckoutBtn.textContent = 'View My Bookings';
             // Ensure the listener is correctly set to navigate
             // Remove old listener if necessary and add new one
             const newCancelBtn = domElements.cancelCheckoutBtn.cloneNode(true);
             domElements.cancelCheckoutBtn.parentNode.replaceChild(newCancelBtn, domElements.cancelCheckoutBtn);
             newCancelBtn.addEventListener('click', () => navigateTo('account', { initialTab: 'account-bookings-tab' }));
            
             // Optionally navigate automatically after a delay
             // setTimeout(() => navigateTo('account', { initialTab: 'account-bookings-tab' }), 3000);

        } else {
            displayError(domElements.checkoutError, result.message || 'Payment failed.');
        }
    } catch (error) {
        displayError(domElements.checkoutError, error.message || 'Payment failed due to network or server error.');
    } finally {
         if (submitButton) {
            submitButton.disabled = false;
            submitButton.querySelector('.spinner-small')?.remove();
         }
          form.classList.remove('quantum-submitting');
    }
} 