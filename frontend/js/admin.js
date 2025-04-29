// admin.js - Handles all logic for the Admin Hyperspace Control Panel

import { quantumApiRequest } from './api.js';
import { domElements, displayToast, navigateTo, switchAdminPanel, showLoader, hideLoader } from './ui.js';
import { getCurrentUser } from './auth.js';
import { formatDate, clearError, displayError, displaySuccess, clearSuccess, disableForm } from './utils.js';
// Import cars functions if needed for populating selects in admin modals
import { populateLocationDropdowns, fetchAndPopulateLocations, formatCurrency } from './cars.js'; 

// --- State --- (Module-specific)
let adminUsersCache = [];
let adminLocationsCache = [];
let adminCarsCache = [];
let adminBookingsCache = [];
let currentAdminUserSearch = '';
let currentAdminLocationSearch = '';
let currentAdminCarSearch = '';
let currentAdminBookingSearch = '';
let currentAdminBookingStatusFilter = '';

// --- Admin Dashboard Setup ---

/**
 * Initializes the admin dashboard, fetches initial data, and sets up listeners.
 * @param {string} [initialPanel='admin-overview-section'] - The ID of the panel to display first.
 */
export function setupAdminDashboard(initialPanel = 'admin-overview-section') {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') {
        console.error("Unauthorized access attempt to admin dashboard.");
        navigateTo('cars');
        displayToast('Access denied: Requires admin privileges.', 'error');
        return;
    }

    // Attach listeners for main admin panel navigation (if not handled globally in ui.js)
    domElements.adminNavBtns?.forEach(btn => {
         // Simple way to ensure listeners aren't duplicated if called multiple times
         btn.replaceWith(btn.cloneNode(true)); 
         const newBtn = document.querySelector(`.admin-nav-btn[data-panel="${btn.dataset.panel}"]`);
         newBtn?.addEventListener('click', () => {
            switchAdminPanel(newBtn.dataset.panel); // switchAdminPanel is imported from ui.js
        });
    });

    // Attach listeners for search/filter inputs and add buttons
    setupAdminEventListeners();

    // Switch to the initial panel (this will also trigger data fetching for that panel)
    switchAdminPanel(initialPanel); 
}

/**
 * Sets up event listeners specific to the admin panel controls (search, filters, add buttons, modal interactions).
 */
function setupAdminEventListeners() {
    // --- Search Listeners ---
    const userSearchInput = document.getElementById('admin-user-search');
    userSearchInput?.addEventListener('input', debounce(() => {
        currentAdminUserSearch = userSearchInput.value.trim();
        renderAdminUserTable(adminUsersCache); // Re-render with current search term
    }, 300));

     const locationSearchInput = document.getElementById('admin-location-search');
     locationSearchInput?.addEventListener('input', debounce(() => {
         currentAdminLocationSearch = locationSearchInput.value.trim();
         renderAdminLocationTable(adminLocationsCache); 
     }, 300));

     const carSearchInput = document.getElementById('admin-car-search');
     carSearchInput?.addEventListener('input', debounce(() => {
         currentAdminCarSearch = carSearchInput.value.trim();
         renderAdminCarTable(adminCarsCache); 
     }, 300));

     const bookingSearchInput = document.getElementById('admin-booking-search');
     bookingSearchInput?.addEventListener('input', debounce(() => {
         currentAdminBookingSearch = bookingSearchInput.value.trim();
         renderAdminBookingTable(adminBookingsCache); 
     }, 300));

    // --- Filter Listener ---
    const bookingStatusFilter = document.getElementById('admin-filter-booking-status');
    bookingStatusFilter?.addEventListener('change', () => {
        currentAdminBookingStatusFilter = bookingStatusFilter.value;
        // Fetch or just filter locally? Fetching is safer if data is large or stale
        fetchAndDisplayAdminBookings(); 
    });
    document.getElementById('admin-apply-booking-filters-btn')?.addEventListener('click', fetchAndDisplayAdminBookings);

    // --- "Add" Button Listeners ---
    document.getElementById('admin-add-user-btn')?.addEventListener('click', () => openUserModal());
    document.getElementById('admin-add-location-btn')?.addEventListener('click', () => openLocationModal());
    document.getElementById('admin-add-car-btn')?.addEventListener('click', () => openCarModal());
    document.getElementById('admin-create-booking-btn')?.addEventListener('click', () => openAdminBookingModal()); 

    // --- Modal Close Buttons ---
    document.getElementById('close-user-modal')?.addEventListener('click', closeUserModal);
    document.getElementById('close-location-modal')?.addEventListener('click', closeLocationModal);
    document.getElementById('close-car-modal')?.addEventListener('click', closeCarModal);
    document.getElementById('close-view-booking-modal')?.addEventListener('click', closeViewBookingModal);
    document.getElementById('close-edit-booking-modal')?.addEventListener('click', closeAdminBookingModal);

    // --- Modal Form Submissions ---
    document.getElementById('user-modal-form')?.addEventListener('submit', handleUserModalSubmit);
    document.getElementById('location-modal-form')?.addEventListener('submit', handleLocationModalSubmit);
    document.getElementById('car-modal-form')?.addEventListener('submit', handleCarModalSubmit);
    document.getElementById('admin-edit-booking-form')?.addEventListener('submit', handleAdminBookingFormSubmit);

    // --- Car Modal Image Preview ---
    document.getElementById('modal-car-images')?.addEventListener('change', handleImagePreview);
}

// Debounce helper function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// --- Overview Panel ---

/**
 * Fetches and displays data for the admin overview panel.
 */
export async function fetchAdminOverviewData() {
    if (!domElements.overviewTotalRevenue || !domElements.overviewActiveBookings || !domElements.overviewFutureBookings || !domElements.overviewTotalUsers || !domElements.overviewTotalCars || !domElements.overviewRecentBookings) {
         console.warn("Admin overview elements not cached.");
         return;
    }
    
    // Show placeholders
    domElements.overviewTotalRevenue.textContent = '--';
    domElements.overviewActiveBookings.textContent = '--';
    domElements.overviewFutureBookings.textContent = '--';
    domElements.overviewTotalUsers.textContent = '--';
    domElements.overviewTotalCars.textContent = '--';
    domElements.overviewRecentBookings.innerHTML = `<li>Loading real-time data... <div class="spinner-small"></div></li>`;

    try {
        // Assume a single endpoint provides all overview data
        const result = await quantumApiRequest('/admin/overview', 'GET', null, true, 'admin_fetch');
        
        if (result && result.success && result.data) {
            const data = result.data;
            domElements.overviewTotalRevenue.textContent = formatCurrency(data.totalRevenue || 0, 'TZS');
            domElements.overviewActiveBookings.textContent = data.activeBookings || '0';
            domElements.overviewFutureBookings.textContent = data.futureBookings || '0';
            domElements.overviewTotalUsers.textContent = data.totalUsers || '0';
            domElements.overviewTotalCars.textContent = data.totalCars || '0';

            // Render recent bookings
            if (data.recentBookings && data.recentBookings.length > 0) {
                domElements.overviewRecentBookings.innerHTML = data.recentBookings.map(b => `
                    <li class="hover-effect" title="Ref: ${b._id}">
                        <i class="fas fa-shuttle-space"></i> 
                        <strong>${b.user?.name || 'Unknown User'}</strong> booked 
                        <strong>${b.car?.make || ''} ${b.car?.model || 'Vehicle'}</strong> 
                        (${formatDate(b.start_date)} - ${formatDate(b.end_date)}) 
                        <span class="status-badge status-${b.status}">${b.status?.replace('_', ' ') || 'Unknown'}</span>
                    </li>
                `).join('');
            } else {
                domElements.overviewRecentBookings.innerHTML = '<li>No recent activity detected.</li>';
            }
        } else {
            throw new Error(result.message || 'Failed to fetch overview data');
        }

    } catch (error) {
        console.error("Failed to fetch admin overview data:", error);
        displayToast(`Error loading overview: ${error.message}`, 'error');
         domElements.overviewRecentBookings.innerHTML = `<li class="error-message show">Failed to load data</li>`;
    }
}

// --- User Management ---

/**
 * Fetches and displays the list of users in the admin panel.
 */
export async function fetchAndDisplayAdminUsers() {
    if (!domElements.adminUserList) return;
    domElements.adminUserList.innerHTML = `<p>Loading user signatures... <div class="spinner-small"></div></p>`;
    try {
        const result = await quantumApiRequest('/admin/users', 'GET', null, true, 'admin_fetch');
        adminUsersCache = result.data || [];
        renderAdminUserTable(adminUsersCache);
    } catch (error) {
        console.error("Failed to fetch admin users:", error);
        domElements.adminUserList.innerHTML = `<p class="error-message show">Could not load user data: ${error.message}</p>`;
    }
}

/**
 * Renders the user table based on cached data and search term.
 * @param {object[]} users - Array of user objects from cache.
 */
function renderAdminUserTable(users) {
    if (!domElements.adminUserList) return;

    const filteredUsers = users.filter(user => 
        user.name.toLowerCase().includes(currentAdminUserSearch.toLowerCase()) ||
        user.email.toLowerCase().includes(currentAdminUserSearch.toLowerCase())
    );

    if (filteredUsers.length === 0) {
         domElements.adminUserList.innerHTML = `<p>No users found matching "${currentAdminUserSearch}".</p>`;
        return;
    }

    const tableHtml = `
        <table class="quantum-table hover-rows">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Member Since</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${filteredUsers.map(user => `
                    <tr>
                        <td>${user.name}</td>
                        <td>${user.email}</td>
                        <td><span class="badge role-${user.role}">${user.role}</span></td>
                        <td>${formatDate(user.createdAt)}</td>
                        <td>
                            <button class="btn btn-outline-info btn-small admin-edit-user-btn" data-user-id="${user._id}" title="Edit User"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-danger btn-small admin-delete-user-btn" data-user-id="${user._id}" title="Delete User"><i class="fas fa-trash-alt"></i></button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    domElements.adminUserList.innerHTML = tableHtml;
    attachUserActionListeners();
}

/** Attaches listeners to edit/delete buttons in the user table */
function attachUserActionListeners() {
     document.querySelectorAll('.admin-edit-user-btn').forEach(btn => {
         btn.addEventListener('click', (e) => {
             const userId = e.currentTarget.dataset.userId;
             const userToEdit = adminUsersCache.find(u => u._id === userId);
             if (userToEdit) {
                 openUserModal(userToEdit);
             }
         });
     });
     document.querySelectorAll('.admin-delete-user-btn').forEach(btn => {
         btn.addEventListener('click', handleDeleteUser);
     });
}

/** Opens the user modal (for adding or editing). */
function openUserModal(user = null) {
    if (!domElements.userModal) return;
    const form = document.getElementById('user-modal-form');
    const title = document.getElementById('user-modal-title');
    const passwordGroup = document.getElementById('password-field-group');
    const passwordInput = document.getElementById('modal-user-password');
    const errorMsg = document.getElementById('user-modal-error');

    form.reset();
    if (errorMsg) clearError(errorMsg);
    form.classList.remove('was-validated'); 

    if (user) {
        // Edit mode
        title.textContent = 'Edit User Signature';
        document.getElementById('edit-user-id').value = user._id;
        document.getElementById('modal-user-name').value = user.name || '';
        document.getElementById('modal-user-email').value = user.email || '';
        document.getElementById('modal-user-role').value = user.role || 'customer';
        // Hide password field unless specifically needed for password reset (add logic if required)
        if (passwordGroup) passwordGroup.style.display = 'none'; 
        if (passwordInput) passwordInput.required = false; 
    } else {
        // Add mode
        title.textContent = 'Add New User Signature';
        document.getElementById('edit-user-id').value = '';
        if (passwordGroup) passwordGroup.style.display = 'block'; 
        if (passwordInput) passwordInput.required = true;
    }
    domElements.userModal.style.display = 'block';
    requestAnimationFrame(() => { // Ensure display:block is applied before adding class
         domElements.userModal.querySelector('.modal-content')?.classList.add('show');
    });
}

/** Closes the user modal. */
function closeUserModal() {
    if (!domElements.userModal) return;
    const modalContent = domElements.userModal.querySelector('.modal-content');
    if(modalContent) modalContent.classList.remove('show');
    
    modalContent?.addEventListener('transitionend', () => {
        domElements.userModal.style.display = 'none';
    }, { once: true });
}

/** Handles submission of the user add/edit form. */
async function handleUserModalSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const userId = document.getElementById('edit-user-id').value;
    const errorMsg = document.getElementById('user-modal-error');
    const submitButton = form.querySelector('button[type="submit"]');
    clearError(errorMsg);

    const name = document.getElementById('modal-user-name').value.trim();
    const email = document.getElementById('modal-user-email').value.trim();
    const role = document.getElementById('modal-user-role').value;
    const password = document.getElementById('modal-user-password').value; // Only relevant for new users

    const isEditing = !!userId;

    if (!name || !email || !role || (!isEditing && !password)) {
         displayError(errorMsg, 'Please fill all required fields.');
         return;
    }
    // Add more specific validation if needed

    const userData = { name, email, role };
    if (!isEditing && password) {
        userData.password = password;
    }

    const method = isEditing ? 'PUT' : 'POST';
    const endpoint = isEditing ? `/admin/users/${userId}` : '/admin/users';

    try {
        if (submitButton) {
             submitButton.disabled = true;
             submitButton.innerHTML += ' <div class="spinner-small"></div>';
        }
        form.classList.add('quantum-submitting');
        
        const result = await quantumApiRequest(endpoint, method, userData, true, 'admin_update');
        if (result.success) {
            displayToast(`User ${isEditing ? 'updated' : 'added'} successfully!`, 'success');
            closeUserModal();
            fetchAndDisplayAdminUsers(); // Refresh the table
        } else {
             displayError(errorMsg, result.message || `Failed to ${isEditing ? 'update' : 'add'} user.`);
        }
    } catch (error) {
        displayError(errorMsg, error.message || `An error occurred while ${isEditing ? 'updating' : 'adding'} the user.`);
    } finally {
         if (submitButton) {
             submitButton.disabled = false;
             submitButton.querySelector('.spinner-small')?.remove();
         }
          form.classList.remove('quantum-submitting');
    }
}

/** Handles deletion of a user. */
async function handleDeleteUser(event) {
    const userId = event.currentTarget.dataset.userId;
    const userToDelete = adminUsersCache.find(u => u._id === userId);

    if (!userId || !userToDelete) return;

    if (confirm(`Are you sure you want to delete user "${userToDelete.name}" (${userToDelete.email})? This action cannot be undone.`)) {
        try {
            showLoader('admin_update');
            await quantumApiRequest(`/admin/users/${userId}`, 'DELETE', null, true, 'admin_update');
            displayToast('User deleted successfully!', 'success');
            fetchAndDisplayAdminUsers(); // Refresh list
        } catch (error) {
             displayToast(`Failed to delete user: ${error.message}`, 'error');
        } finally {
             hideLoader();
        }
    }
}


// --- Location Management --- (Similar structure to Users)

export async function fetchAndDisplayAdminLocations() {
     if (!domElements.adminLocationList) return;
     domElements.adminLocationList.innerHTML = `<p>Loading location nexus points... <div class="spinner-small"></div></p>`;
     try {
         const result = await quantumApiRequest('/admin/locations', 'GET', null, true, 'admin_fetch');
         adminLocationsCache = result.data || [];
         renderAdminLocationTable(adminLocationsCache);
     } catch (error) {
         console.error("Failed to fetch admin locations:", error);
         domElements.adminLocationList.innerHTML = `<p class="error-message show">Could not load location data: ${error.message}</p>`;
     }
}

function renderAdminLocationTable(locations) {
     if (!domElements.adminLocationList) return;

     const filteredLocations = locations.filter(loc => 
         (loc.address && loc.address.toLowerCase().includes(currentAdminLocationSearch.toLowerCase())) ||
         (loc.city && loc.city.toLowerCase().includes(currentAdminLocationSearch.toLowerCase())) ||
         (loc.country && loc.country.toLowerCase().includes(currentAdminLocationSearch.toLowerCase()))
     );

    if (filteredLocations.length === 0) {
         domElements.adminLocationList.innerHTML = `<p>No locations found matching "${currentAdminLocationSearch}".</p>`;
        return;
    }

    const tableHtml = `
        <table class="quantum-table hover-rows">
            <thead>
                <tr>
                    <th>City</th>
                    <th>Address</th>
                    <th>Country</th>
                     <th>Coordinates</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${filteredLocations.map(loc => `
                    <tr>
                        <td>${loc.city || 'N/A'}</td>
                        <td>${loc.address || 'N/A'}</td>
                        <td>${loc.country || 'N/A'}</td>
                        <td>${loc.coordinates ? loc.coordinates.join(', ') : 'N/A'}</td>
                        <td>
                            <button class="btn btn-outline-info btn-small admin-edit-location-btn" data-location-id="${loc._id}" title="Edit Location"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-danger btn-small admin-delete-location-btn" data-location-id="${loc._id}" title="Delete Location"><i class="fas fa-trash-alt"></i></button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    domElements.adminLocationList.innerHTML = tableHtml;
    attachLocationActionListeners();
}

function attachLocationActionListeners() {
      document.querySelectorAll('.admin-edit-location-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
              const locId = e.currentTarget.dataset.locationId;
              const locToEdit = adminLocationsCache.find(l => l._id === locId);
              if (locToEdit) {
                  openLocationModal(locToEdit);
              }
          });
      });
      document.querySelectorAll('.admin-delete-location-btn').forEach(btn => {
          btn.addEventListener('click', handleDeleteLocation);
      });
}

function openLocationModal(location = null) {
    if (!domElements.locationModal) return;
    const form = document.getElementById('location-modal-form');
    const title = document.getElementById('location-modal-title');
    const errorMsg = document.getElementById('location-modal-error');

    form.reset();
    if(errorMsg) clearError(errorMsg);

    if (location) {
        // Edit mode
        title.textContent = 'Edit Nexus Point';
        document.getElementById('edit-location-id').value = location._id;
        document.getElementById('modal-loc-address').value = location.address || '';
        document.getElementById('modal-loc-city').value = location.city || '';
        document.getElementById('modal-loc-state').value = location.state || '';
        document.getElementById('modal-loc-country').value = location.country || '';
        document.getElementById('modal-loc-zip').value = location.zip_code || '';
        document.getElementById('modal-loc-coords').value = location.coordinates ? location.coordinates.join(', ') : '';
    } else {
        // Add mode
        title.textContent = 'Add New Nexus Point';
        document.getElementById('edit-location-id').value = '';
    }
    domElements.locationModal.style.display = 'block';
     requestAnimationFrame(() => {
         domElements.locationModal.querySelector('.modal-content')?.classList.add('show');
     });
}

function closeLocationModal() {
     if (!domElements.locationModal) return;
     const modalContent = domElements.locationModal.querySelector('.modal-content');
     if(modalContent) modalContent.classList.remove('show');
    
     modalContent?.addEventListener('transitionend', () => {
         domElements.locationModal.style.display = 'none';
     }, { once: true });
}

async function handleLocationModalSubmit(event) {
     event.preventDefault();
     const form = event.target;
     const locationId = document.getElementById('edit-location-id').value;
     const errorMsg = document.getElementById('location-modal-error');
     const submitButton = form.querySelector('button[type="submit"]');
     clearError(errorMsg);

     const address = document.getElementById('modal-loc-address').value.trim();
     const city = document.getElementById('modal-loc-city').value.trim();
     const state = document.getElementById('modal-loc-state').value.trim();
     const country = document.getElementById('modal-loc-country').value.trim();
     const zip_code = document.getElementById('modal-loc-zip').value.trim();
     const coordsString = document.getElementById('modal-loc-coords').value.trim();

    // Basic validation
    if (!address || !city || !state || !country || !zip_code) {
        displayError(errorMsg, 'Please fill all required fields.');
        return;
    }

    let coordinates = null;
    if (coordsString) {
        const parts = coordsString.split(',').map(s => parseFloat(s.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            coordinates = parts; // Assuming [latitude, longitude] or [longitude, latitude] - check backend expectation
        } else {
            displayError(errorMsg, 'Invalid coordinates format. Use "lat, lon" or "lon, lat".');
            return;
        }
    }

     const locationData = { address, city, state, country, zip_code, coordinates };

     const isEditing = !!locationId;
     const method = isEditing ? 'PUT' : 'POST';
     const endpoint = isEditing ? `/admin/locations/${locationId}` : '/admin/locations';

     try {
         if (submitButton) {
             submitButton.disabled = true;
             submitButton.innerHTML += ' <div class="spinner-small"></div>';
         }
         form.classList.add('quantum-submitting');
         
         const result = await quantumApiRequest(endpoint, method, locationData, true, 'admin_update');
         if (result.success) {
             displayToast(`Location ${isEditing ? 'updated' : 'added'} successfully!`, 'success');
             closeLocationModal();
             fetchAndDisplayAdminLocations(); 
             fetchAndPopulateLocations(); // Also refresh public location list used elsewhere
         } else {
             displayError(errorMsg, result.message || `Failed to ${isEditing ? 'update' : 'add'} location.`);
         }
     } catch (error) {
         displayError(errorMsg, error.message || `An error occurred while ${isEditing ? 'updating' : 'adding'} the location.`);
     } finally {
          if (submitButton) {
             submitButton.disabled = false;
             submitButton.querySelector('.spinner-small')?.remove();
         }
          form.classList.remove('quantum-submitting');
     }
}

async function handleDeleteLocation(event) {
     const locationId = event.currentTarget.dataset.locationId;
     const locToDelete = adminLocationsCache.find(l => l._id === locationId);

     if (!locationId || !locToDelete) return;

     if (confirm(`Are you sure you want to delete location "${locToDelete.city}, ${locToDelete.address}"? Check if cars or bookings depend on it.`)) {
         try {
            showLoader('admin_update');
            await quantumApiRequest(`/admin/locations/${locationId}`, 'DELETE', null, true, 'admin_update');
             displayToast('Location deleted successfully!', 'success');
             fetchAndDisplayAdminLocations();
             fetchAndPopulateLocations(); // Refresh public list
         } catch (error) {
             displayToast(`Failed to delete location: ${error.message}`, 'error');
         } finally {
            hideLoader();
         }
     }
}

// --- Car Management --- (More complex due to images)

export async function fetchAndDisplayAdminCars() {
    if (!domElements.adminCarList) return;
    domElements.adminCarList.innerHTML = `<p>Loading fleet units... <div class="spinner-small"></div></p>`;
    try {
        const result = await quantumApiRequest('/admin/cars', 'GET', null, true, 'admin_fetch');
        adminCarsCache = result.data || [];
        renderAdminCarTable(adminCarsCache);
    } catch (error) {
        console.error("Failed to fetch admin cars:", error);
        domElements.adminCarList.innerHTML = `<p class="error-message show">Could not load fleet data: ${error.message}</p>`;
    }
}

function renderAdminCarTable(cars) {
     if (!domElements.adminCarList) return;

     const filteredCars = cars.filter(car => 
         (car.make && car.make.toLowerCase().includes(currentAdminCarSearch.toLowerCase())) ||
         (car.model && car.model.toLowerCase().includes(currentAdminCarSearch.toLowerCase())) ||
         (car.vin && car.vin.toLowerCase().includes(currentAdminCarSearch.toLowerCase()))
     );

    if (filteredCars.length === 0) {
         domElements.adminCarList.innerHTML = `<p>No cars found matching "${currentAdminCarSearch}".</p>`;
        return;
    }

    const tableHtml = `
        <table class="quantum-table hover-rows">
            <thead>
                <tr>
                    <th>Image</th>
                    <th>Make/Model/Year</th>
                    <th>VIN</th>
                    <th>Location</th>
                    <th>Rate</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${filteredCars.map(car => `
                    <tr>
                        <td><img src="${car.imageUrls?.[0] || 'images/quantum-car-placeholder.png'}" alt="${car.make} ${car.model}" class="table-thumbnail" loading="lazy" onerror="this.onerror=null; this.src='images/quantum-car-placeholder.png';"></td>
                        <td>${car.make || ''} ${car.model || ''} (${car.year || 'N/A'})</td>
                        <td>${car.vin || 'N/A'}</td>
                        <td>${car.location?.city || 'N/A'}</td>
                        <td>$${car.daily_rate?.toFixed(2) || 'N/A'}</td>
                        <td><span class="status-badge status-${car.availability_status}">${car.availability_status?.replace('_', ' ') || 'Unknown'}</span></td>
                        <td>
                            <button class="btn btn-outline-info btn-small admin-edit-car-btn" data-car-id="${car._id}" title="Edit Car"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-danger btn-small admin-delete-car-btn" data-car-id="${car._id}" title="Delete Car"><i class="fas fa-trash-alt"></i></button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    domElements.adminCarList.innerHTML = tableHtml;
    attachCarActionListeners();
}

function attachCarActionListeners() {
    document.querySelectorAll('.admin-edit-car-btn').forEach(btn => {
         btn.addEventListener('click', (e) => {
             const carId = e.currentTarget.dataset.carId;
             const carToEdit = adminCarsCache.find(c => c._id === carId);
             if (carToEdit) {
                 openCarModal(carToEdit);
             }
         });
     });
     document.querySelectorAll('.admin-delete-car-btn').forEach(btn => {
         btn.addEventListener('click', handleDeleteCar);
     });
}

async function openCarModal(car = null) {
     if (!domElements.carModal) return;
     const form = document.getElementById('car-modal-form');
     const title = document.getElementById('car-modal-title');
     const errorMsg = document.getElementById('car-modal-error');
     const imagePreviewContainer = document.getElementById('image-preview-container');
     const progressBar = document.getElementById('car-modal-progress');

     form.reset();
     if(errorMsg) clearError(errorMsg);
     if(imagePreviewContainer) imagePreviewContainer.innerHTML = ''; // Clear previews
     if(progressBar) progressBar.style.display = 'none'; // Hide progress bar

     // Populate location dropdown in the modal - ensure locations are fetched first
     const locationSelect = document.getElementById('modal-car-location');
     if (!locationSelect) {
         displayError(errorMsg, "Location dropdown missing in car modal.");
         return;
     }
     // Use cached locations if available, otherwise fetch
     if (!adminLocationsCache || adminLocationsCache.length === 0) {
         await fetchAndDisplayAdminLocations(); // Fetch if cache is empty
     }
     // Assuming fetchAndPopulateLocations is imported and works with cached data?
     // Or adapt populateLocationDropdowns to use adminLocationsCache
     populateLocationDropdowns([locationSelect]); // Populate with available locations

     if (car) {
         // Edit mode
         title.textContent = 'Edit Fleet Unit';
         document.getElementById('edit-car-id').value = car._id;
         document.getElementById('modal-car-make').value = car.make || '';
         document.getElementById('modal-car-model').value = car.model || '';
         document.getElementById('modal-car-year').value = car.year || '';
         document.getElementById('modal-car-vin').value = car.vin || '';
         document.getElementById('modal-car-category').value = car.category || '';
         document.getElementById('modal-car-fuel').value = car.fuel_type || '';
         document.getElementById('modal-car-capacity').value = car.passenger_capacity || '';
         document.getElementById('modal-car-transmission').value = car.transmission || '';
         document.getElementById('modal-car-rate').value = car.daily_rate || '';
         locationSelect.value = car.location?._id || car.location || ''; // Handle populated object or just ID
         document.getElementById('modal-car-features').value = (car.features || []).join(', ');
         document.getElementById('modal-car-availability').value = car.availability_status || 'available';

         // Display existing images (maybe just names or thumbnails)
         if (car.imageUrls && imagePreviewContainer) {
             car.imageUrls.forEach(url => {
                 const imgElement = document.createElement('img');
                 imgElement.src = url;
                 imgElement.alt = 'Existing image';
                 imgElement.className = 'image-preview';
                 imagePreviewContainer.appendChild(imgElement);
             });
         }

     } else {
         // Add mode
         title.textContent = 'Add New Fleet Unit';
         document.getElementById('edit-car-id').value = '';
     }

     domElements.carModal.style.display = 'block';
      requestAnimationFrame(() => {
          domElements.carModal.querySelector('.modal-content')?.classList.add('show');
      });
}

function closeCarModal() {
    if (!domElements.carModal) return;
    const modalContent = domElements.carModal.querySelector('.modal-content');
    if(modalContent) modalContent.classList.remove('show');
    
    modalContent?.addEventListener('transitionend', () => {
        domElements.carModal.style.display = 'none';
    }, { once: true });
}

function handleImagePreview(event) {
    const previewContainer = document.getElementById('image-preview-container');
    if (!previewContainer) return;
    previewContainer.innerHTML = ''; // Clear existing previews on new selection

    const files = event.target.files;
    if (files) {
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.alt = file.name;
                    img.className = 'image-preview';
                    previewContainer.appendChild(img);
                }
                reader.readAsDataURL(file);
            }
        });
    }
}

async function handleCarModalSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const carId = document.getElementById('edit-car-id').value;
    const errorMsg = document.getElementById('car-modal-error');
    const progressBarContainer = document.getElementById('car-modal-progress');
    const progressBar = progressBarContainer?.querySelector('.progress-bar');
    const submitButton = form.querySelector('button[type="submit"]');
    clearError(errorMsg);

    // Use FormData to handle file uploads
    const formData = new FormData(form); 
    
    // Manual validation (FormData doesn't trigger native validation easily)
    const make = formData.get('make')?.trim(); // Adjust field names if form differs
    const model = formData.get('model')?.trim();
    const year = formData.get('year')?.trim();
    const vin = formData.get('vin')?.trim();
    const category = formData.get('category');
    // ... validate other required fields from formData ...
    if (!make || !model || !year || !vin || !category /* ... add others */) {
        displayError(errorMsg, 'Please fill all required fields.');
        return;
    }
    // Add specific format validation (VIN, year range etc.) if needed

    const isEditing = !!carId;
    const method = isEditing ? 'PUT' : 'POST';
    const endpoint = isEditing ? `/admin/cars/${carId}` : '/admin/cars';

    try {
        if (submitButton) submitButton.disabled = true;
        if (progressBarContainer) progressBarContainer.style.display = 'block';
        if (progressBar) progressBar.style.width = '0%';
        form.classList.add('quantum-submitting');

        // Use fetch directly for FormData and progress tracking
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: method,
            headers: {
                 // Don't set Content-Type for FormData, browser does it with boundary
                'Authorization': `Bearer ${getAuthToken()}` 
            },
            body: formData,
             // Add upload progress listener if needed (more complex setup)
        });

        const result = await response.json(); 

        if (!response.ok) {
            throw new Error(result.message || `Server responded with ${response.status}`);
        }

        if (result.success) {
             displayToast(`Car ${isEditing ? 'updated' : 'added'} successfully!`, 'success');
             closeCarModal();
             fetchAndDisplayAdminCars(); // Refresh table
        } else {
            displayError(errorMsg, result.message || `Failed to ${isEditing ? 'update' : 'add'} car.`);
        }

    } catch (error) {
         displayError(errorMsg, error.message || `An error occurred while ${isEditing ? 'updating' : 'adding'} the car.`);
    } finally {
         if (submitButton) submitButton.disabled = false;
         if (progressBarContainer) progressBarContainer.style.display = 'none';
          form.classList.remove('quantum-submitting');
    }
}

async function handleDeleteCar(event) {
    const carId = event.currentTarget.dataset.carId;
    const carToDelete = adminCarsCache.find(c => c._id === carId);

    if (!carId || !carToDelete) return;

    if (confirm(`Are you sure you want to delete "${carToDelete.year} ${carToDelete.make} ${carToDelete.model}" (VIN: ${carToDelete.vin})? This cannot be undone.`)) {
         try {
            showLoader('admin_update');
            await quantumApiRequest(`/admin/cars/${carId}`, 'DELETE', null, true, 'admin_update');
             displayToast('Car deleted successfully!', 'success');
             fetchAndDisplayAdminCars(); 
         } catch (error) {
             displayToast(`Failed to delete car: ${error.message}`, 'error');
         } finally {
            hideLoader();
         }
    }
}

// --- Booking Management ---

export async function fetchAndDisplayAdminBookings() {
     if (!domElements.adminBookingList) return;
     domElements.adminBookingList.innerHTML = `<p>Loading trajectory logs... <div class="spinner-small"></div></p>`;
     
     const queryParams = new URLSearchParams();
     if (currentAdminBookingStatusFilter) {
         queryParams.append('status', currentAdminBookingStatusFilter);
     }
     // Add search query param if backend supports it
     // if (currentAdminBookingSearch) {
     //     queryParams.append('search', currentAdminBookingSearch);
     // }
     // Add pagination params if needed

     const endpoint = `/admin/bookings?${queryParams.toString()}`;
     
     try {
         const result = await quantumApiRequest(endpoint, 'GET', null, true, 'admin_fetch');
         adminBookingsCache = result.data || [];
         renderAdminBookingTable(adminBookingsCache); // Render uses cache + local search term
     } catch (error) {
         console.error("Failed to fetch admin bookings:", error);
         domElements.adminBookingList.innerHTML = `<p class="error-message show">Could not load booking data: ${error.message}</p>`;
     }
}

function renderAdminBookingTable(bookings) {
    if (!domElements.adminBookingList) return;

     // Local search after fetching (or rely on backend search if implemented)
    const filteredBookings = bookings.filter(booking => 
         (booking._id && booking._id.toLowerCase().includes(currentAdminBookingSearch.toLowerCase())) ||
         (booking.user?.name && booking.user.name.toLowerCase().includes(currentAdminBookingSearch.toLowerCase())) ||
         (booking.user?.email && booking.user.email.toLowerCase().includes(currentAdminBookingSearch.toLowerCase())) ||
         (booking.car?.make && booking.car.make.toLowerCase().includes(currentAdminBookingSearch.toLowerCase())) ||
         (booking.car?.model && booking.car.model.toLowerCase().includes(currentAdminBookingSearch.toLowerCase())) ||
         (booking.car?.vin && booking.car.vin.toLowerCase().includes(currentAdminBookingSearch.toLowerCase()))
    );

    if (filteredBookings.length === 0) {
         domElements.adminBookingList.innerHTML = `<p>No bookings found matching filter/search criteria.</p>`;
        return;
    }

    const tableHtml = `
        <table class="quantum-table hover-rows">
            <thead>
                <tr>
                    <th>Ref ID</th>
                    <th>User</th>
                    <th>Car</th>
                    <th>Dates</th>
                    <th>Cost</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${filteredBookings.map(b => `
                    <tr>
                        <td>${b._id}</td>
                        <td>${b.user?.name || b.user?.email || 'N/A'}</td>
                        <td>${b.car?.make || ''} ${b.car?.model || 'N/A'}</td>
                        <td>${formatDate(b.start_date)} - ${formatDate(b.end_date)}</td>
                        <td>$${b.total_cost?.toFixed(2) || 'N/A'}</td>
                        <td><span class="status-badge status-${b.status}">${b.status?.replace('_', ' ') || 'Unknown'}</span></td>
                        <td>
                             <button class="btn btn-outline-secondary btn-small admin-view-booking-btn" data-booking-id="${b._id}" title="View Details"><i class="fas fa-eye"></i></button>
                             <button class="btn btn-outline-info btn-small admin-edit-booking-btn" data-booking-id="${b._id}" title="Edit Booking"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-danger btn-small admin-delete-booking-btn" data-booking-id="${b._id}" title="Delete Booking"><i class="fas fa-trash-alt"></i></button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    domElements.adminBookingList.innerHTML = tableHtml;
    attachBookingActionListeners();
}

function attachBookingActionListeners() {
     document.querySelectorAll('.admin-view-booking-btn').forEach(btn => {
         btn.addEventListener('click', (e) => openViewBookingModal(e.currentTarget.dataset.bookingId));
     });
     document.querySelectorAll('.admin-edit-booking-btn').forEach(btn => {
         btn.addEventListener('click', (e) => openAdminBookingModal(e.currentTarget.dataset.bookingId));
     });
     document.querySelectorAll('.admin-delete-booking-btn').forEach(btn => {
         btn.addEventListener('click', handleDeleteBooking);
     });
}

async function openViewBookingModal(bookingId) {
     const modal = document.getElementById('admin-view-booking-modal');
     const contentDiv = document.getElementById('admin-view-booking-content');
     const idSpan = document.getElementById('view-booking-id');
     if (!modal || !contentDiv || !idSpan) return;

     idSpan.textContent = bookingId.substring(0, 8) + '...';
     contentDiv.innerHTML = `<p>Loading details... <div class="spinner-small"></div></p>`;
     modal.style.display = 'block';
      requestAnimationFrame(() => {
          modal.querySelector('.modal-content')?.classList.add('show');
      });

     try {
         // Fetch full booking details
         const result = await quantumApiRequest(`/admin/bookings/${bookingId}`, 'GET', null, true, 'admin_fetch');
         if (result.success && result.data) {
             const booking = result.data;
             // Format and display the details
             contentDiv.innerHTML = `
                <div class="detail-row"><span class="detail-label">Booking Ref:</span> <span class="detail-value">${booking._id}</span></div>
                <div class="detail-row"><span class="detail-label">Status:</span> <span class="detail-value"><span class="status-badge status-${booking.status}">${booking.status?.replace('_',' ') || 'Unknown'}</span></span></div>
                <hr>
                <h4>User Details</h4>
                <div class="detail-row"><span class="detail-label">Name:</span> <span class="detail-value">${booking.user?.name || 'N/A'}</span></div>
                <div class="detail-row"><span class="detail-label">Email:</span> <span class="detail-value">${booking.user?.email || 'N/A'}</span></div>
                <hr>
                <h4>Car Details</h4>
                <div class="detail-row"><span class="detail-label">Vehicle:</span> <span class="detail-value">${booking.car?.year || ''} ${booking.car?.make || ''} ${booking.car?.model || 'N/A'}</span></div>
                <div class="detail-row"><span class="detail-label">VIN:</span> <span class="detail-value">${booking.car?.vin || 'N/A'}</span></div>
                 <div class="detail-row"><span class="detail-label">Daily Rate:</span> <span class="detail-value">$${booking.car?.daily_rate?.toFixed(2) || 'N/A'}</span></div>
                 <hr>
                <h4>Booking Period & Cost</h4>
                <div class="detail-row"><span class="detail-label">Start Date:</span> <span class="detail-value">${formatDate(booking.start_date)}</span></div>
                <div class="detail-row"><span class="detail-label">End Date:</span> <span class="detail-value">${formatDate(booking.end_date)}</span></div>
                <div class="detail-row"><span class="detail-label">Pickup:</span> <span class="detail-value">${booking.pickup_location?.city || 'N/A'} - ${booking.pickup_location?.address || ''}</span></div>
                <div class="detail-row"><span class="detail-label">Dropoff:</span> <span class="detail-value">${booking.dropoff_location?.city || 'N/A'} - ${booking.dropoff_location?.address || ''}</span></div>
                <div class="detail-row"><span class="detail-label">Total Cost:</span> <span class="detail-value"><strong>$${booking.total_cost?.toFixed(2) || 'N/A'}</strong></span></div>
                <hr>
                 <div class="detail-row"><span class="detail-label">Created At:</span> <span class="detail-value">${new Date(booking.createdAt).toLocaleString()}</span></div>
                <div class="detail-row"><span class="detail-label">Last Updated:</span> <span class="detail-value">${new Date(booking.updatedAt).toLocaleString()}</span></div>
            `;
         } else {
            throw new Error(result.message || 'Failed to load booking details.');
         }
     } catch (error) {
         contentDiv.innerHTML = `<p class="error-message show">Error loading details: ${error.message}</p>`;
     }
}

function closeViewBookingModal() {
    const modal = document.getElementById('admin-view-booking-modal');
     if (!modal) return;
     const modalContent = modal.querySelector('.modal-content');
     if(modalContent) modalContent.classList.remove('show');
    
     modalContent?.addEventListener('transitionend', () => {
         modal.style.display = 'none';
     }, { once: true });
}

async function openAdminBookingModal(bookingId = null) {
     const modal = document.getElementById('admin-edit-booking-modal');
     const form = document.getElementById('admin-edit-booking-form');
     const title = document.getElementById('admin-edit-booking-title');
     const errorMsg = document.getElementById('admin-edit-booking-error');
     if (!modal || !form || !title || !errorMsg) return;

     form.reset();
     clearError(errorMsg);

     // Populate User Select
     const userSelect = document.getElementById('admin-booking-user-select');
     if (!userSelect) return;
     userSelect.innerHTML = '<option value="">Loading Users...</option>';
     if (!adminUsersCache || adminUsersCache.length === 0) await fetchAndDisplayAdminUsers(); // Fetch if needed
     userSelect.innerHTML = '<option value="">-- Select User --</option>' + 
         adminUsersCache.map(u => `<option value="${u._id}">${u.name} (${u.email})</option>`).join('');
     // Consider adding search functionality to selects if lists are long

     // Populate Car Select
     const carSelect = document.getElementById('admin-booking-car-select');
     if (!carSelect) return;
     carSelect.innerHTML = '<option value="">Loading Cars...</option>';
     if (!adminCarsCache || adminCarsCache.length === 0) await fetchAndDisplayAdminCars(); // Fetch if needed
     carSelect.innerHTML = '<option value="">-- Select Unit --</option>' + 
         adminCarsCache.map(c => `<option value="${c._id}">${c.year} ${c.make} ${c.model} (VIN: ${c.vin})</option>`).join('');

     // Populate Location Selects
     const pickupLocSelect = document.getElementById('admin-booking-pickup-location');
     const dropoffLocSelect = document.getElementById('admin-booking-dropoff-location');
     if (!pickupLocSelect || !dropoffLocSelect) return;
     if (!adminLocationsCache || adminLocationsCache.length === 0) await fetchAndDisplayAdminLocations(); // Fetch if needed
     populateLocationDropdowns([pickupLocSelect, dropoffLocSelect]); 

     if (bookingId) {
         // Edit mode - fetch existing booking data
         title.textContent = 'Edit Trajectory';
         document.getElementById('admin-edit-booking-id').value = bookingId;
         showLoader('admin_fetch');
         try {
             const result = await quantumApiRequest(`/admin/bookings/${bookingId}`, 'GET', null, true);
             if (result.success && result.data) {
                 const booking = result.data;
                 userSelect.value = booking.user?._id || booking.user || ''; 
                 carSelect.value = booking.car?._id || booking.car || '';
                 document.getElementById('admin-booking-start-date').valueAsDate = new Date(booking.start_date);
                 document.getElementById('admin-booking-end-date').valueAsDate = new Date(booking.end_date);
                 pickupLocSelect.value = booking.pickup_location?._id || booking.pickup_location || '';
                 dropoffLocSelect.value = booking.dropoff_location?._id || booking.dropoff_location || '';
                 document.getElementById('admin-booking-status').value = booking.status || 'confirmed';
                 document.getElementById('admin-booking-cost').value = booking.total_cost?.toFixed(2) || '';
             } else {
                 throw new Error(result.message || 'Could not load booking data for editing.');
             }
         } catch(error) {
             displayError(errorMsg, `Error loading booking: ${error.message}`);
             // Optionally close modal or disable form
         } finally {
             hideLoader();
         }

     } else {
         // Create mode
         title.textContent = 'Create New Trajectory';
         document.getElementById('admin-edit-booking-id').value = '';
         // Set default dates? e.g., today
     }

     modal.style.display = 'block';
      requestAnimationFrame(() => {
          modal.querySelector('.modal-content')?.classList.add('show');
      });
}

function closeAdminBookingModal() {
    const modal = document.getElementById('admin-edit-booking-modal');
     if (!modal) return;
     const modalContent = modal.querySelector('.modal-content');
     if(modalContent) modalContent.classList.remove('show');
    
     modalContent?.addEventListener('transitionend', () => {
         modal.style.display = 'none';
     }, { once: true });
}

async function handleAdminBookingFormSubmit(event) {
     event.preventDefault();
     const form = event.target;
     const bookingId = document.getElementById('admin-edit-booking-id').value;
     const errorMsg = document.getElementById('admin-edit-booking-error');
     const submitButton = form.querySelector('button[type="submit"]');
     clearError(errorMsg);

     // Collect data
     const bookingData = {
         user: document.getElementById('admin-booking-user-select').value,
         car: document.getElementById('admin-booking-car-select').value,
         start_date: document.getElementById('admin-booking-start-date').value,
         end_date: document.getElementById('admin-booking-end-date').value,
         pickup_location: document.getElementById('admin-booking-pickup-location').value,
         dropoff_location: document.getElementById('admin-booking-dropoff-location').value,
         status: document.getElementById('admin-booking-status').value,
         total_cost: document.getElementById('admin-booking-cost').value // May need parsing to float
     };

     // Basic validation
     if (!bookingData.user || !bookingData.car || !bookingData.start_date || !bookingData.end_date || !bookingData.pickup_location || !bookingData.dropoff_location || !bookingData.status) {
         displayError(errorMsg, 'Please fill all required fields.');
         return;
     }
     // Add date validation (end >= start)

     const isEditing = !!bookingId;
     const method = isEditing ? 'PUT' : 'POST';
     const endpoint = isEditing ? `/admin/bookings/${bookingId}` : '/admin/bookings';

     try {
         if (submitButton) {
             submitButton.disabled = true;
             submitButton.innerHTML += ' <div class="spinner-small"></div>';
         }
         form.classList.add('quantum-submitting');

         const result = await quantumApiRequest(endpoint, method, bookingData, true, 'admin_update');
         if (result.success) {
             displayToast(`Booking ${isEditing ? 'updated' : 'created'} successfully!`, 'success');
             closeAdminBookingModal();
             fetchAndDisplayAdminBookings(); 
         } else {
             displayError(errorMsg, result.message || `Failed to ${isEditing ? 'update' : 'create'} booking.`);
         }
     } catch (error) {
         displayError(errorMsg, error.message || `An error occurred while ${isEditing ? 'updating' : 'creating'} the booking.`);
     } finally {
         if (submitButton) {
             submitButton.disabled = false;
             submitButton.querySelector('.spinner-small')?.remove();
         }
          form.classList.remove('quantum-submitting');
     }
}

async function handleDeleteBooking(event) {
    const bookingId = event.currentTarget.dataset.bookingId;
    if (!bookingId) return;

    if (confirm(`Are you sure you want to delete booking Ref ${bookingId}? This action cannot be undone.`)) {
        try {
            showLoader('admin_update');
            await quantumApiRequest(`/admin/bookings/${bookingId}`, 'DELETE', null, true, 'admin_update');
            displayToast('Booking deleted successfully!', 'success');
            fetchAndDisplayAdminBookings(); 
        } catch (error) {
            displayToast(`Failed to delete booking: ${error.message}`, 'error');
        } finally {
            hideLoader();
        }
    }
} 