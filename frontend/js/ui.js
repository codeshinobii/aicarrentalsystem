// ui.js - Handles general UI interactions, DOM manipulation, and visual effects

// Import dependencies (some will be created later)
import { getCurrentUser, getAuthToken } from './auth.js'; // Added getAuthToken import
// We need access to fetch functions for navigation targets
// This creates circular dependencies if navigateTo calls fetch... 
// Consider restructuring or passing functions if this becomes an issue.
import { fetchAndDisplayCars } from './cars.js'; 
import { setupAccountPage } from './account.js';
import { setupAdminDashboard } from './admin.js';

// --- DOM Elements Cache ---
export let domElements = {}; // Export to be used by other modules

/**
 * Caches frequently accessed DOM elements.
 */
export function cacheDOMElements() {
    domElements = {
        themeToggle: document.getElementById('theme-toggle'),
        loadingOverlay: document.getElementById('loading-overlay'),
        loadingText: document.querySelector('#loading-overlay .loading-text'),
        carListDiv: document.getElementById('car-list'),
        paginationControls: document.getElementById('pagination-controls'),
        landingSection: document.getElementById('landing-section'),
        signinSection: document.getElementById('signin-section'),
        carsSection: document.getElementById('cars-section'),
        bookingSection: document.getElementById('booking-section'),
        accountSection: document.getElementById('account-section'),
        checkoutSection: document.getElementById('checkout-section'),
        adminSection: document.getElementById('admin-section'),
        navCars: document.getElementById('nav-cars'),
        navSignin: document.getElementById('nav-signin'),
        navAccount: document.getElementById('nav-account'),
        navAdmin: document.getElementById('nav-admin'),
        navLogout: document.getElementById('nav-logout'),
        userGreeting: document.getElementById('user-greeting'),
        // Filters
        filterLocation: document.getElementById('filter-location'),
        filterPassengers: document.getElementById('filter-passengers'),
        filterDistance: document.getElementById('filter-distance'),
        filterPurpose: document.getElementById('filter-purpose'),
        filterFuelPriority: document.getElementById('filter-fuel-priority'),
        sortCars: document.getElementById('sort-cars'),
        applyFiltersBtn: document.getElementById('apply-filters-btn'),
        resetFiltersBtn: document.getElementById('reset-filters-btn'),
        // Login Form
        loginForm: document.getElementById('login-form'),
        loginEmail: document.getElementById('login-email'),
        loginPassword: document.getElementById('login-password'),
        loginError: document.getElementById('login-error'),
        // Register Form
        registerForm: document.getElementById('register-form'),
        registerName: document.getElementById('register-name'),
        registerEmail: document.getElementById('register-email'),
        registerPassword: document.getElementById('register-password'),
        registerConfirmPassword: document.getElementById('register-confirm-password'),
        registerError: document.getElementById('register-error'),
        // Booking Form
        bookingForm: document.getElementById('booking-form'),
        bookingCarId: document.getElementById('booking-car-id'),
        bookingCarDetails: document.getElementById('booking-car-details'),
        bookingStartDate: document.getElementById('booking-start-date'),
        bookingEndDate: document.getElementById('booking-end-date'),
        bookingPickupLocation: document.getElementById('booking-pickup-location'),
        bookingDropoffLocation: document.getElementById('booking-dropoff-location'),
        bookingError: document.getElementById('booking-error'),
        bookingSuccess: document.getElementById('booking-success'),
        cancelBookingBtn: document.getElementById('cancel-booking-btn'),
        // Account Section
        accountGreeting: document.getElementById('account-greeting'),
        userDisplayName: document.getElementById('user-display-name'),
        userEmail: document.getElementById('user-email'),
        accountNavBtns: document.querySelectorAll('.account-nav-btn'),
        accountTabs: document.querySelectorAll('.account-tab'),
        bookingSnapshotContent: document.getElementById('snapshot-content'),
        upcomingBookingsList: document.getElementById('upcoming-bookings-list'),
        pastBookingsList: document.getElementById('past-bookings-list'),
        // Profile Edit Form
        editProfileForm: document.getElementById('edit-profile-form'),
        profileName: document.getElementById('profile-name'),
        profileEmail: document.getElementById('profile-email'),
        editProfileError: document.getElementById('edit-profile-error'),
        editProfileSuccess: document.getElementById('edit-profile-success'),
        // Change Password Form
        changePasswordForm: document.getElementById('change-password-form'),
        currentPassword: document.getElementById('current-password'),
        newPassword: document.getElementById('new-password'),
        confirmPassword: document.getElementById('confirm-password'),
        changePasswordError: document.getElementById('change-password-error'),
        changePasswordSuccess: document.getElementById('change-password-success'),
        // AI Prefs Form
        aiPreferencesForm: document.getElementById('ai-preferences-form'),
        aiPrefPassengers: document.getElementById('ai-pref-passengers'),
        aiPrefCarType: document.getElementById('ai-pref-car-type'),
        aiPrefUseCase: document.getElementById('ai-pref-use-case'),
        aiPrefFuelPref: document.getElementById('ai-pref-fuel-pref'),
        aiPrefsError: document.getElementById('ai-prefs-error'),
        aiPrefsSuccess: document.getElementById('ai-prefs-success'),
        // Checkout
        checkoutBookingRef: document.getElementById('checkout-booking-ref'),
        checkoutCarDetails: document.getElementById('checkout-car-details'),
        checkoutBookingDates: document.getElementById('checkout-booking-dates'),
        checkoutBookingCost: document.getElementById('checkout-booking-cost'),
        checkoutForm: document.getElementById('checkout-form'),
        checkoutBookingId: document.getElementById('checkout-booking-id'),
        checkoutError: document.getElementById('checkout-error'),
        checkoutSuccess: document.getElementById('checkout-success'),
        cancelCheckoutBtn: document.getElementById('cancel-checkout-btn'),
        // Admin Elements
        adminNavBtns: document.querySelectorAll('.admin-nav-btn'),
        adminPanels: document.querySelectorAll('.admin-panel'),
        overviewTotalRevenue: document.getElementById('overview-total-revenue'),
        overviewActiveBookings: document.getElementById('overview-active-bookings'),
        overviewFutureBookings: document.getElementById('overview-future-bookings'),
        overviewTotalUsers: document.getElementById('overview-total-users'),
        overviewTotalCars: document.getElementById('overview-total-cars'),
        overviewRecentBookings: document.getElementById('overview-recent-bookings'),
        adminUserList: document.getElementById('admin-user-list'),
        adminLocationList: document.getElementById('admin-location-list'),
        adminCarList: document.getElementById('admin-car-list'),
        adminBookingList: document.getElementById('admin-booking-list'),
        // Modals
        userModal: document.getElementById('user-modal'),
        locationModal: document.getElementById('location-modal'),
        carModal: document.getElementById('car-modal'),
        adminViewBookingModal: document.getElementById('admin-view-booking-modal'),
        adminEditBookingModal: document.getElementById('admin-edit-booking-modal'),
        // Add new view elements
        carCountDisplay: document.getElementById('car-count-display'),
        viewCardBtn: document.getElementById('view-card-btn'),
        viewListBtn: document.getElementById('view-list-btn'),
        // Auth related
        logoutButton: document.getElementById('logout-button'),
        authSection: document.getElementById('auth-section'),
        appSection: document.getElementById('app-section'),
        // Navigation
        navLinks: document.querySelectorAll('.nav-link'),
        contentSections: document.querySelectorAll('.content-section'),
        // Fleet specific
        carGrid: document.getElementById('car-list'),
        filterLocation: document.getElementById('filter-location'),
        filterPassengers: document.getElementById('filter-passengers'),
        filterDistance: document.getElementById('filter-distance'),
        filterPurpose: document.getElementById('filter-purpose'),
        filterFuelPriority: document.getElementById('filter-fuel-priority'),
        sortCars: document.getElementById('sort-cars'),
        viewCardBtn: document.getElementById('view-card-btn'),
        viewListBtn: document.getElementById('view-list-btn'),
        // Account specific
        accountTabs: document.querySelectorAll('.account-tab-button'),
        accountContentSections: document.querySelectorAll('.account-content-section'),
        profileForm: document.getElementById('profile-form'),
        aiPreferencesForm: document.getElementById('ai-preferences-form'),
        bookingHistoryList: document.getElementById('booking-history-list'),
        // Admin specific
        adminTabs: document.querySelectorAll('.admin-tab-button'),
        adminContentSections: document.querySelectorAll('.admin-content-section'),
        userManagementList: document.getElementById('user-management-list'),
        vehicleManagementList: document.getElementById('vehicle-management-list'),
        bookingManagementList: document.getElementById('booking-management-list'),
        systemStatusInfo: document.getElementById('system-status-info'),
        // Common UI elements
        loader: document.getElementById('loader'),
        toastContainer: document.getElementById('toast-container'),
        // Form switch buttons within signin card
        backToHomeLink: document.getElementById('back-to-home-link'),
        authTabs: document.querySelectorAll('.auth-tab-btn'),
        forgotPasswordLink: document.getElementById('forgot-password-link'),
        termsLink: document.getElementById('terms-link'),
        privacyLink: document.getElementById('privacy-link'),
        // Add landing page CTAs if needed globally (though main.js handles listeners)
        ctaExploreFleet: document.getElementById('cta-explore-fleet'),
        ctaBrowseNow: document.getElementById('cta-browse-cars'),
        ctaSignupLanding: document.getElementById('cta-signup'),
    };
    // Clean up null references
    Object.keys(domElements).forEach(key => {
        if (domElements[key] === null || (domElements[key] instanceof NodeList && domElements[key].length === 0)) {
             console.warn(`DOM Element cache warning: ${key} not found.`);
             // Optionally delete the key: delete domElements[key]; 
        }
    });
    console.log("DOM Elements Cached", domElements);
}

// --- Theme Management ---
export function setupThemeToggle() {
    if (!domElements.themeToggle) return;

    const storedTheme = localStorage.getItem('intelliride_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = storedTheme || (prefersDark ? 'dark' : 'light');

    document.documentElement.setAttribute('data-theme', initialTheme);

    domElements.themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('intelliride_theme', newTheme);

        // Optional: Trigger particle recreation or other theme-dependent updates
        // Example: document.dispatchEvent(new CustomEvent('themeChanged', { detail: newTheme }));
    });
}

// --- Loader ---
export function showLoader(context = '') {
    if (!domElements.loadingOverlay) return;

    let message = 'Initializing Quantum Interface...';
    // Add meaningful messages based on context
    switch (context) {
        case 'login': message = 'Authenticating quantum signature...'; break;
        case 'register': message = 'Registering new signature...'; break;
        case 'booking_request': message = 'Calculating space-time coordinates...'; break;
        case 'booking_confirm': message = 'Locking trajectory...'; break;
        case 'payment': message = 'Establishing secure quantum channel...'; break;
        case 'profile_fetch': message = 'Accessing neural profile...'; break;
        case 'profile_update': message = 'Syncing profile modifications...'; break;
        case 'admin_fetch': message = 'Accessing admin hyperspace...'; break;
        case 'admin_update': message = 'Propagating changes through the network...'; break;
        case 'cars_fetch': message = 'Scanning available dimensions...'; break;
        case 'locations_fetch': message = 'Mapping known nexus points...'; break;
        case 'logout': message = 'Disengaging neural link...'; break;
        default: message = 'Processing quantum request...';
    }
    if (domElements.loadingText) domElements.loadingText.textContent = message;

    domElements.loadingOverlay.style.display = 'flex'; 
    domElements.loadingOverlay.classList.add('quantum-loading'); 
    document.body.style.overflow = 'hidden';
}

export function hideLoader() {
    if (!domElements.loadingOverlay) return;

    domElements.loadingOverlay.style.opacity = '0';
    setTimeout(() => {
        domElements.loadingOverlay.style.display = 'none';
        domElements.loadingOverlay.classList.remove('quantum-loading');
        document.body.style.overflow = '';
        domElements.loadingOverlay.style.opacity = '1'; 
    }, 300); 
}

// --- Toast Notifications ---
export function displayToast(message, type = 'info', duration = 5000) {
    const toastContainer = document.body; 
    const toast = document.createElement('div');
    toast.className = `quantum-toast toast-${type}`;
    toast.setAttribute('role', 'alert');

    let iconClass = 'fas fa-info-circle'; 
    if (type === 'success') iconClass = 'fas fa-check-circle';
    else if (type === 'error') iconClass = 'fas fa-exclamation-triangle';
    else if (type === 'warning') iconClass = 'fas fa-exclamation-circle';

    toast.innerHTML = `
        <div class="toast-icon"><i class="${iconClass}"></i></div>
        <div class="toast-message">${message}</div>
        <button class="toast-close-btn" aria-label="Close">&times;</button>
    `;

    toastContainer.appendChild(toast);

    requestAnimationFrame(() => { 
        toast.classList.add('show');
    });

    const closeBtn = toast.querySelector('.toast-close-btn');
    const dismissToast = () => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => {
            if (toast.parentNode) {
                 toast.remove();
            }
        }, { once: true });
    };

    closeBtn.addEventListener('click', dismissToast);

    const timer = setTimeout(dismissToast, duration);

     toast.addEventListener('mouseenter', () => clearTimeout(timer));
     toast.addEventListener('mouseleave', () => setTimeout(dismissToast, duration)); 

}

// --- Particle Network (Background Effect) ---
export function initParticleNetwork() {
    if (!domElements.particleContainer) return;
    const canvas = document.createElement('canvas');
    domElements.particleContainer.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) { 
        console.error("Could not get 2D context for particle canvas"); 
        return; 
    }
    
    let particles = [];
    let animationFrameId;

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        createParticles(); 
    }

    function createParticles() {
        particles = [];
        const particleCount = window.innerWidth < 768 ? 40 : 80; 
        const theme = document.documentElement.getAttribute('data-theme') || 'light';
        const baseColor = theme === 'dark' ? '0, 217, 255' : '0, 123, 255'; 

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2.5 + 1, 
                speedX: Math.random() * 0.6 - 0.3, 
                speedY: Math.random() * 0.6 - 0.3,
                color: `rgba(${baseColor}, ${Math.random() * 0.4 + 0.1})` 
            });
        }
    }

    function connectParticles() {
        const maxDistance = 120; 
        const theme = document.documentElement.getAttribute('data-theme') || 'light';
        const lineColorBase = theme === 'dark' ? '0, 217, 255' : '0, 123, 255';

        ctx.lineWidth = 0.3; 

        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) { 
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < maxDistance) {
                    const opacity = 1 - (distance / maxDistance);
                    ctx.strokeStyle = `rgba(${lineColorBase}, ${opacity * 0.3})`; 
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(p => {
            p.x += p.speedX;
            p.y += p.speedY;

            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
        });

        connectParticles();
        animationFrameId = requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resizeCanvas);
    
    // Use MutationObserver to detect theme changes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            if (mutation.attributeName === 'data-theme') {
                console.log("Theme changed, recreating particles...");
                createParticles();
            }
        });
    });
    observer.observe(document.documentElement, { attributes: true });

    resizeCanvas(); 
    animate();

    // Cleanup on unload
    window.addEventListener('beforeunload', () => {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', resizeCanvas);
        observer.disconnect(); // Disconnect observer
    });
}

// --- Navigation & View Management ---

const sections = ['landing', 'signin', 'cars', 'booking', 'account', 'checkout', 'admin'];

/**
 * Shows the specified section and hides others.
 * Also handles running setup functions for certain sections.
 * @param {string} sectionId - The ID prefix of the section to show (e.g., 'landing', 'cars').
 * @param {object|null} [data=null] - Optional data to pass to section setup functions.
 */
export function navigateTo(sectionId, data = null) {
    console.log(`Navigating to: ${sectionId}`, data);
    // Hide all sections first
    sections.forEach(id => {
        const section = document.getElementById(`${id}-section`);
        if (section) section.style.display = 'none';
    });

    // Show the target section
    const targetSection = document.getElementById(`${sectionId}-section`);
    if (targetSection) {
        targetSection.style.display = sectionId === 'signin' ? 'flex' : 'block';
        
        // Add animation class
        targetSection.classList.remove('animate__fadeIn', 'animate__fadeInUp'); 
        void targetSection.offsetWidth; // Trigger reflow
        targetSection.classList.add('animate__animated', 'animate__fadeIn'); 

        window.scrollTo({ top: 0, behavior: 'smooth' });

        // --- Handle specific section logic --- 
        const user = getCurrentUser(); // Get current user state from auth module
        
        // Reset forms when navigating TO signin
        if (sectionId === 'signin') {
             toggleAuthForm(false); // Default to login form
             domElements.loginForm?.reset();
             domElements.registerForm?.reset();
             if(domElements.loginError) domElements.loginError.textContent = '';
             if(domElements.registerError) domElements.registerError.textContent = '';
        }

        // Existing logic for other sections
        switch (sectionId) {
            case 'cars':
                fetchAndDisplayCars(); 
                break;
            case 'account':
                if (user) {
                    setupAccountPage(data?.initialTab);
                } else {
                    console.warn('Attempted to navigate to account while logged out. Redirecting to signin.');
                    navigateTo('signin'); 
                    return; 
                }
                break;
            case 'admin':
                 if (user?.role === 'admin') {
                    setupAdminDashboard(data?.initialPanel);
                 } else {
                    console.warn('Attempted to navigate to admin without privileges. Redirecting to cars.');
                    navigateTo('cars'); 
                    return;
                 }
                 break;
            case 'checkout':
                 if (user && data?.booking) {
                    setupCheckoutPage(data.booking);
                 } else if (!user) {
                     displayToast('Please login to proceed to checkout.', 'warning');
                     navigateTo('signin');
                     return;
                 } else {
                     console.error('Checkout navigation failed: Missing booking data.');
                     displayToast('Could not load checkout details.', 'error');
                     navigateTo('cars'); // Fallback
                     return;
                 }
                 break;
            case 'booking':
                 if (!user) {
                     displayToast('Please login to make a booking.', 'warning');
                     navigateTo('signin');
                     return;
                 }
                 console.warn("populateLocationDropdowns needs to be imported and called here if moved");
                 break;
        }

    } else {
        console.error(`Navigation Error: Section with ID "${sectionId}-section" not found.`);
        navigateTo('cars'); // Fallback to cars page
    }

    updateActiveNavButton(sectionId);
}

/**
 * Updates the active state visual for the main navigation buttons.
 * @param {string} activeSectionId - The ID prefix of the currently active section.
 */
function updateActiveNavButton(activeSectionId) {
    document.querySelectorAll('.header-right .nav-btn').forEach(btn => {
        btn.classList.remove('active');
        // Match button id (e.g., nav-cars) with the sectionId
        if (btn.id === `nav-${activeSectionId}`) {
            btn.classList.add('active');
        }
    });
}

/**
 * Sets up primary navigation event listeners.
 */
export async function setupNavigation() {
    const { handleLogout } = await import('./auth.js'); 
    
    // Standard Nav Buttons
    domElements.navCars?.addEventListener('click', () => navigateTo('cars'));
    domElements.navSignin?.addEventListener('click', () => navigateTo('signin'));
    domElements.navAccount?.addEventListener('click', () => navigateTo('account'));
    domElements.navAdmin?.addEventListener('click', () => navigateTo('admin'));
    domElements.navLogout?.addEventListener('click', handleLogout);

    // Footer Nav Links
    document.getElementById('footer-nav-home')?.addEventListener('click', (e) => { e.preventDefault(); navigateTo('cars'); });
    document.getElementById('footer-nav-cars')?.addEventListener('click', (e) => { e.preventDefault(); navigateTo('cars'); });

    // Logo Link
    document.getElementById('logo-link')?.addEventListener('click', (e) => { e.preventDefault(); navigateTo('landing'); });

    // Auth Tab Buttons (New)
    domElements.authTabs?.forEach(tab => {
        tab.addEventListener('click', () => {
             const targetFormId = tab.dataset.form;
             toggleAuthForm(targetFormId === 'register-form');
        });
    });

    // Forgot Password Link (Placeholder)
    domElements.forgotPasswordLink?.addEventListener('click', (e) => {
        e.preventDefault();
        console.log("Forgot Password clicked - functionality not implemented.");
        displayToast('Forgot Password functionality is under development.', 'info');
    });

    // Back to Home link from Signin page
    domElements.backToHomeLink?.addEventListener('click', (e) => { e.preventDefault(); navigateTo('cars'); });

    // Basic Cancel Buttons
    domElements.cancelBookingBtn?.addEventListener('click', () => navigateTo('cars'));
    domElements.cancelCheckoutBtn?.addEventListener('click', () => navigateTo('account'));
}

/**
 * Shows/hides the Login or Register form and updates tab states.
 * @param {boolean} showRegister - True to show register form, false to show login form.
 */
export function toggleAuthForm(showRegister) {
    if (!domElements.loginForm || !domElements.registerForm || !domElements.authTabs) {
        console.error("Auth forms or tabs not found in cache for toggling.");
        return;
    }

    // Update Tab Active States
    domElements.authTabs.forEach(tab => {
        const isActive = (tab.dataset.form === 'register-form' && showRegister) || 
                       (tab.dataset.form === 'login-form' && !showRegister);
        tab.classList.toggle('active', isActive);
    });

    // Show/Hide Forms
    domElements.loginForm.style.display = showRegister ? 'none' : 'block';
    domElements.registerForm.style.display = showRegister ? 'block' : 'none';

    // Add active class for potential specific styling
    domElements.loginForm.classList.toggle('active', !showRegister);
    domElements.registerForm.classList.toggle('active', showRegister);

    // Remove animation logic here, CSS handles :not(.active) { display: none; }
    /*
    if (showRegister) {
        // ... animation code ...
    } else {
        // ... animation code ...
    }
    */
    
    // Clear errors when switching
    if(domElements.loginError) domElements.loginError.textContent = '';
    if(domElements.registerError) domElements.registerError.textContent = '';
}

// --- Tab/Panel Switching Logic (Can be kept here or moved) ---
// Keeping them here for now, but they depend on account/admin functions.

/**
 * Switches the visible tab in the account section.
 * @param {string} tabId - The ID of the tab content element to show.
 */
export async function switchAccountTab(tabId) {
     // Import necessary functions dynamically or ensure they are loaded
     const { fetchAndDisplayUserBookings, populateProfileForm, populateAiPreferencesForm } = await import('./account.js');
     
    // Hide all tabs
    domElements.accountTabs?.forEach(tab => tab.style.display = 'none');
    // Deactivate all buttons
    domElements.accountNavBtns?.forEach(btn => btn.classList.remove('active'));

    // Show the selected tab
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) {
        selectedTab.style.display = 'block';
        selectedTab.classList.remove('animate__fadeIn');
        void selectedTab.offsetWidth;
        selectedTab.classList.add('animate__animated', 'animate__fadeIn');
    }

    // Activate the selected button
    const selectedBtn = document.querySelector(`.account-nav-btn[data-tab="${tabId}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }

     // Load data for the tab if needed
    switch (tabId) {
        case 'account-bookings-tab':
            fetchAndDisplayUserBookings();
            break;
        case 'account-profile-tab':
            populateProfileForm();
            break;
        case 'account-ai-preferences-tab':
            populateAiPreferencesForm();
            break;
    }
}

/**
 * Switches the visible panel in the admin dashboard.
 * @param {string} panelId - The ID of the panel element to show.
 */
export async function switchAdminPanel(panelId) {
     // Import admin functions dynamically or ensure they are loaded
     const { 
         fetchAdminOverviewData, 
         fetchAndDisplayAdminUsers, 
         fetchAndDisplayAdminLocations, 
         fetchAndDisplayAdminCars, 
         fetchAndDisplayAdminBookings 
     } = await import('./admin.js');
     
     // Hide all panels
    domElements.adminPanels?.forEach(panel => panel.style.display = 'none');
    // Deactivate all buttons
    domElements.adminNavBtns?.forEach(btn => btn.classList.remove('active'));

    // Show the selected panel
    const selectedPanel = document.getElementById(panelId);
    if (selectedPanel) {
        selectedPanel.style.display = 'block';
        selectedPanel.classList.remove('animate__fadeIn');
        void selectedPanel.offsetWidth;
        selectedPanel.classList.add('animate__animated', 'animate__fadeIn');
    }

    // Activate the selected button
    const selectedBtn = document.querySelector(`.admin-nav-btn[data-panel="${panelId}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }

    // Load data for the panel when switched to
    switch (panelId) {
        case 'admin-overview-section': fetchAdminOverviewData(); break;
        case 'admin-user-list-panel': fetchAndDisplayAdminUsers(); break;
        case 'admin-location-management': fetchAndDisplayAdminLocations(); break;
        case 'admin-car-management': fetchAndDisplayAdminCars(); break;
        case 'admin-booking-management': fetchAndDisplayAdminBookings(); break;
    }
}

/**
 * Updates the UI elements based on the current authentication state.
 */
export function updateUIAuthState() {
    const loggedInElements = document.querySelectorAll('.nav-logged-in');
    const loggedOutElements = document.querySelectorAll('.nav-logged-out');
    const adminElements = document.querySelectorAll('.nav-admin');
    const user = getCurrentUser(); // Get current user state
    const token = getAuthToken(); // Get token state

    if (token && user) {
        loggedInElements.forEach(el => el.style.display = 'inline-block'); 
        loggedOutElements.forEach(el => el.style.display = 'none');
        if (domElements.userGreeting) {
            // Display first name, fallback to full name or 'User'
            const firstName = user.name?.split(' ')[0] || user.name || 'User';
            domElements.userGreeting.innerHTML = `Welcome, <strong class="hover-effect">${firstName}</strong>!`; 
        }
        // Show admin elements if user is admin
        if (user.role === 'admin') {
            adminElements.forEach(el => el.style.display = 'inline-block'); 
        } else {
            adminElements.forEach(el => el.style.display = 'none');
        }
    } else {
        // Logged out state
        loggedInElements.forEach(el => el.style.display = 'none');
        loggedOutElements.forEach(el => el.style.display = 'inline-block');
        adminElements.forEach(el => el.style.display = 'none');
         if (domElements.userGreeting) domElements.userGreeting.textContent = '';
    }
}

// --- View Mode Toggle ---

/**
 * Toggles between Card and List view for the car grid.
 * @param {'card' | 'list'} mode - The desired view mode.
 */
export function toggleViewMode(mode) {
    if (!domElements.carListDiv || !domElements.viewCardBtn || !domElements.viewListBtn) {
        console.error("Cannot toggle view mode: Essential elements missing.");
        return;
    }

    if (mode === 'list') {
        domElements.carListDiv.classList.add('list-view');
        domElements.viewListBtn.classList.add('active');
        domElements.viewCardBtn.classList.remove('active');
        localStorage.setItem('intelliride_view_mode', 'list');
    } else { // Default to card view
        domElements.carListDiv.classList.remove('list-view');
        domElements.viewCardBtn.classList.add('active');
        domElements.viewListBtn.classList.remove('active');
        localStorage.setItem('intelliride_view_mode', 'card');
    }
}

/**
 * Sets up the background gradient effect that follows the cursor.
 */
export function setupGradientFollow() {
    const body = document.body;

    // Throttle function to limit updates
    let throttleTimeout;
    const throttleDelay = 16; // Roughly 60fps

    const handleMouseMove = (event) => {
        console.log("Mouse moving - trying to update gradient");
        if (throttleTimeout) return; // Skip if already waiting

        throttleTimeout = setTimeout(() => {
            const x = (event.clientX / window.innerWidth) * 100;
            const y = (event.clientY / window.innerHeight) * 100;

            // Update CSS variables directly on the body
            body.style.setProperty('--cursor-x', `${x}%`);
            body.style.setProperty('--cursor-y', `${y}%`);
            
            throttleTimeout = null; // Clear timeout
        }, throttleDelay);
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Cleanup on unload (good practice)
    window.addEventListener('beforeunload', () => {
        window.removeEventListener('mousemove', handleMouseMove);
         clearTimeout(throttleTimeout); // Clear any pending timeout
    });

    console.log("setupGradientFollow is executing!");
} 