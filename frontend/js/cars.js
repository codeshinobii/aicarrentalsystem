// cars.js - Handles car listing, filtering, pagination, and location data

import { quantumApiRequest } from './api.js';
import { domElements, navigateTo, displayToast } from './ui.js'; // Need navigateTo for book button
import { getAuthToken } from './auth.js';

// --- State --- (Scoped to this module)
let availableLocations = []; // Store { _id, city, address, country }
let allCarsPublic = []; // Store cars for public view/filtering
let currentPage = 1;
let totalPages = 1;
const carsPerPage = 9; // Or import from a config module
let currentFilters = {}; // Store current filter/sort state

// --- Location Fetching and Population ---

/**
 * Fetches location data from the API and caches it.
 */
export async function fetchAndPopulateLocations() {
    try {
        const result = await quantumApiRequest('/locations', 'GET', null, false, 'locations_fetch'); 
        console.log('Raw locations API response:', result);
        
        const locationsData = result?.data || result?.locations || result || [];
        
        if (!Array.isArray(locationsData)) {
            console.error('Locations data is not an array:', locationsData);
            availableLocations = []; 
        } else {
            availableLocations = locationsData; // Cache globally within this module
        }
        
        console.log('Processed availableLocations:', availableLocations); 
        
        // Populate filter dropdown AFTER fetching
        if (domElements.filterLocation) {
             populateLocationDropdowns([domElements.filterLocation], true); 
        } else {
            console.warn("Filter location dropdown not found in DOM cache.");
        }

    } catch (error) {
        console.error("Failed to fetch locations:", error);
        availableLocations = []; 
        // Optionally clear or show error in dropdowns
        if (domElements.filterLocation) {
            domElements.filterLocation.innerHTML = '<option value="">Error loading</option>';
        }
    }
}

/**
 * Populates select dropdown elements with location data.
 * @param {HTMLSelectElement[]} dropdowns - An array of dropdown elements to populate.
 * @param {boolean} [includeAllOption=false] - Whether to include an "All Locations" option.
 */
export function populateLocationDropdowns(dropdowns, includeAllOption = false) {
    if (!Array.isArray(dropdowns)) dropdowns = [dropdowns]; 

    dropdowns.forEach(dropdown => {
         if (!dropdown) return;

        const selectedValue = dropdown.value;
        dropdown.innerHTML = ''; 

        if (includeAllOption) {
            const allOption = document.createElement('option');
            allOption.value = '';
            allOption.textContent = 'All Locations';
            dropdown.appendChild(allOption);
        } else {
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = '-- Select Location --';
            defaultOption.disabled = true;
             if (!selectedValue || availableLocations.length === 0) {
                defaultOption.selected = true;
            }
            dropdown.appendChild(defaultOption);
        }

        availableLocations.forEach(loc => {
            const option = document.createElement('option');
            option.value = loc._id;
            // Combine city and country, add address snippet if available
            let displayText = `${loc.city || 'Unknown City'}, ${loc.country || 'Unknown Country'}`;
             if (loc.address) {
                 displayText += ` (${loc.address.substring(0, 25)}${loc.address.length > 25 ? '...' : ''})`;
             }
             option.textContent = displayText;
            dropdown.appendChild(option);
        });

        if (selectedValue) {
            dropdown.value = selectedValue; // Restore previous selection if possible
        }
    });
}

// --- Car Listing and Filtering ---

/**
 * Fetches car data based on filters and pagination, then renders the list.
 * @param {object} [filters=currentFilters] - Filter object.
 * @param {number} [page=1] - Page number to fetch.
 */
export async function fetchAndDisplayCars(filters = currentFilters, page = 1) {
     if (!domElements.carListDiv) {
         console.error("Car list container not found in DOM cache.");
         return;
     }
    domElements.carListDiv.innerHTML = `<div class="loading-placeholder">Scanning for available dimensions... <div class="spinner-small"></div></div>`;
    if(domElements.paginationControls) domElements.paginationControls.innerHTML = ''; 

    currentFilters = filters;
    currentPage = page; 

    const queryParams = new URLSearchParams();
     if (filters.category) queryParams.append('category', filters.category);
    if (filters.fuel_type) queryParams.append('fuel_type', filters.fuel_type);
    if (filters.location) queryParams.append('location', filters.location);
    if (filters.min_capacity) queryParams.append('passenger_capacity[gte]', filters.min_capacity);
    if (filters.sort) queryParams.append('sort', filters.sort);

    queryParams.append('page', currentPage);
    queryParams.append('limit', carsPerPage);

    // Handle AI Recommended sort - fallback to default (e.g., newest first) if selected
    if (filters.sort === 'ai_recommended') {
        // If backend supports it, keep 'ai_recommended' or transform it.
        // Otherwise, remove or replace it.
        console.log("AI Recommended sort selected - using default sort for now.");
        queryParams.delete('sort'); // Remove sort param, let backend use default
        // OR queryParams.set('sort', '-createdAt'); // Explicitly set default
    }

    try {
        const endpoint = `/cars?${queryParams.toString()}`;
        console.log(`Fetching cars from: ${endpoint}`);
        const result = await quantumApiRequest(endpoint, 'GET', null, false, 'cars_fetch');
        console.log('Raw cars API response:', result);

        const carsData = result?.data || []; 
        const totalDocs = result?.total;
        const paginationObj = result?.pagination; 

        if (!Array.isArray(carsData)) {
             console.error('Cars data received is not an array:', carsData);
             allCarsPublic = [];
             totalPages = 1; 
        } else {
            allCarsPublic = carsData;
            if (totalDocs) {
                 totalPages = Math.ceil(totalDocs / carsPerPage);
                 console.log(`Calculated totalPages: ceil(${totalDocs} / ${carsPerPage}) = ${totalPages}`);
            } else {
                 totalPages = 1; 
                 console.warn("Pagination data (`total` count) missing from API response. Displaying only fetched results.");
            }
             totalPages = Math.max(1, totalPages);
             if (paginationObj?.currentPage) { // Check response for current page
                 currentPage = paginationObj.currentPage;
             }
        }

        console.log('Processed cars data:', allCarsPublic);
        console.log('Pagination Info:', { currentPage, totalPages });
        renderCarList(allCarsPublic);
        renderPaginationControls(); 

        // Update car count display
        if(domElements.carCountDisplay) {
            const total = result.total || allCarsPublic.length; 
            const startNum = allCarsPublic.length > 0 ? (currentPage - 1) * carsPerPage + 1 : 0;
            const endNum = startNum + allCarsPublic.length - 1;
            domElements.carCountDisplay.textContent = `Showing ${startNum}-${endNum} of ${total} cars`;
        } else {
             console.warn("Car count display element not found.");
        }

    } catch (error) {
         console.error('Failed to fetch cars:', error);
         domElements.carListDiv.innerHTML = `
            <div class="empty-state animate__animated animate__fadeIn">
                <div class="quantum-icon"><i class="fas fa-satellite-dish"></i></div>
                <h3>Signal Lost</h3>
                <p>Could not retrieve fleet data. ${error.message || 'Please try again later.'}</p>
            </div>
        `;
        if(domElements.paginationControls) domElements.paginationControls.innerHTML = ''; 
    }
}

/**
 * Renders the list of car cards into the DOM.
 * @param {object[]} cars - Array of car objects.
 */
function renderCarList(cars) { // Keep private to this module
    if (!domElements.carListDiv) return;

    if (!cars || cars.length === 0) {
        domElements.carListDiv.innerHTML = `
            <div class="empty-state animate__animated animate__fadeIn">
                <div class="quantum-icon"><i class="fas fa-ghost"></i></div>
                <h3>Quantum Vacuum Detected</h3>
                <p>No vehicles match your current spacetime coordinates. Try adjusting your filters.</p>
            </div>
        `;
        return;
    }

    domElements.carListDiv.innerHTML = cars.map((car, index) => {
        const locationName = car.location?.city || car.location?.address || 'Unknown Nexus';
        const averageRating = car.averageRating ?? 0; // Default to 0
        const ratingStars = averageRating > 0
            ? Array(Math.floor(averageRating)).fill('<i class="fas fa-star"></i>').join('') +
              (averageRating % 1 >= 0.5 ? '<i class="fas fa-star-half-alt"></i>' : '') +
              Array(Math.max(0, 5 - Math.ceil(averageRating))).fill('<i class="far fa-star"></i>').join('')
            : '<span style="font-style: italic; font-size: 0.8em;">Not rated</span>';

        return `
        <div class="car-card animate__animated animate__fadeInUp" style="animation-delay: ${index * 0.05}s">
            <div class="car-image-container">
                <img src="${car.imageUrls?.[0] || 'images/quantum-car-placeholder.png'}"
                     alt="${car.make || ''} ${car.model || ''}"
                     class="quantum-glow"
                     loading="lazy"
                     onerror="this.onerror=null; this.src='images/quantum-car-placeholder.png'; this.alt='Image unavailable';">
                <span class="availability-badge ${car.availability_status === 'available' ? 'pulse' : 'unavailable'}">
                    ${car.availability_status === 'available' ? 'Available' : car.availability_status === 'rented' ? 'On Mission' : 'Maintenance'}
                </span>
            </div>
            <div class="car-card-content">
                <div class="card-header">
                    <h3>${car.year || ''} ${car.make || ''} ${car.model || ''}</h3>
                    <div class="quantum-rating" title="${averageRating.toFixed(1)} / 5.0">
                        ${ratingStars}
                    </div>
                </div>
                <div class="quantum-specs">
                    <div class="spec-item" title="Passenger capacity"><i class="fas fa-users"></i> ${car.passenger_capacity || 'N/A'}</div>
                    <div class="spec-item" title="Transmission"><i class="fas fa-cogs"></i> ${car.transmission || 'N/A'}</div>
                    <div class="spec-item" title="Fuel type"><i class="fas fa-gas-pump"></i> ${car.fuel_type || 'N/A'}</div>
                    <div class="spec-item" title="Location"><i class="fas fa-map-marker-alt"></i> ${locationName}</div>
                </div>
                <div class="quantum-features">
                    ${(car.features || []).slice(0, 4).map(f => `<span class="quantum-tag hover-effect">${f}</span>`).join('')}
                    ${(car.features || []).length > 4 ? '<span class="quantum-tag">...</span>' : ''}
                </div>
            </div>
            <div class="car-card-footer">
                <div class="quantum-price">
                    ${formatCurrency(car.daily_rate, 'TZS')}
                    <span>/day</span>
                </div>
                <button class="btn btn-primary quantum-btn book-btn hover-effect"
                        data-car-id="${car._id}"
                        data-car-details="${car.year || ''} ${car.make || ''} ${car.model || ''}"
                        ${car.availability_status !== 'available' ? 'disabled' : ''}>
                    ${car.availability_status === 'available' ? 'Book Now <i class="fas fa-arrow-right"></i>' : 'Unavailable'}
                </button>
            </div>
        </div>
    `;
    }).join('');

    attachBookButtonListeners();
}

/**
 * Attaches event listeners to the 'Book Now' buttons.
 */
function attachBookButtonListeners() { // Keep private
     document.querySelectorAll('.book-btn:not([data-listener-attached])').forEach(btn => {
        btn.addEventListener('click', handleBookButtonClick); 
        btn.dataset.listenerAttached = 'true'; // Mark as attached
    });
}

/**
 * Handles clicks on the 'Book Now' button.
 * Checks auth, populates booking form, and navigates.
 * @param {Event} event 
 */
function handleBookButtonClick(event) { // Keep private
    const token = getAuthToken();
    if (!token) {
        displayToast('Please login or register to book a vehicle.', 'warning');
        navigateTo('login');
        return;
    }

    const btn = event.currentTarget;
    // Add ripple effect maybe?

    const carId = btn.dataset.carId;
    const carDetails = btn.dataset.carDetails;

    if (!domElements.bookingCarId || !domElements.bookingCarDetails || !domElements.bookingForm || !domElements.bookingStartDate || !domElements.bookingEndDate || !domElements.bookingError || !domElements.bookingSuccess || !domElements.bookingPickupLocation || !domElements.bookingDropoffLocation) {
        console.error("Booking form elements not found in cache!");
        displayToast("Error initializing booking form.", "error");
        return;
    }

    // Populate booking form
    domElements.bookingCarId.value = carId || '';
    domElements.bookingCarDetails.textContent = carDetails || 'Selected Vehicle';

    // Reset form fields and messages
    domElements.bookingForm.reset(); 
    // Ensure imported utils are used
    import('./utils.js').then(({ clearError, clearSuccess }) => {
        if(domElements.bookingError) clearError(domElements.bookingError);
        if(domElements.bookingSuccess) clearSuccess(domElements.bookingSuccess);
    });
    
    // Populate location dropdowns for the booking form
    populateLocationDropdowns([domElements.bookingPickupLocation, domElements.bookingDropoffLocation]);

    // Set minimum start date to today
    const today = new Date().toISOString().split('T')[0];
    domElements.bookingStartDate.setAttribute('min', today);
    domElements.bookingEndDate.setAttribute('min', today);

    navigateTo('booking');
}

// --- Filter Actions ---

/**
 * Applies the selected filters and fetches the first page of results.
 */
export function applyFilters() {
    currentFilters = { 
        category: domElements.filterCategory?.value,
        fuel_type: domElements.filterFuel?.value,
        location: domElements.filterLocation?.value,
        min_capacity: domElements.filterCapacity?.value,
        sort: domElements.sortCars?.value,
    };
    // Remove empty/null filters
    Object.keys(currentFilters).forEach(key => 
        (currentFilters[key] === null || currentFilters[key] === '') && delete currentFilters[key]
    );
    console.log("Applying filters:", currentFilters);
    fetchAndDisplayCars(currentFilters, 1); 
}

/**
 * Resets all filters to their default values and fetches results.
 */
export function resetFilters() {
     if(domElements.filterCategory) domElements.filterCategory.value = '';
     if(domElements.filterFuel) domElements.filterFuel.value = '';
     if(domElements.filterLocation) domElements.filterLocation.value = '';
     if(domElements.filterCapacity) domElements.filterCapacity.value = '';
     if(domElements.sortCars) domElements.sortCars.value = '-createdAt'; 
     currentFilters = {}; 
     fetchAndDisplayCars({}, 1); 
     displayToast('Filters Reset', 'info', 2000);
}

// --- Pagination Controls --- (Keep private to this module)

/**
 * Renders pagination controls based on current page and total pages.
 */
function renderPaginationControls() {
    if (!domElements.paginationControls || totalPages <= 1) { 
        if (domElements.paginationControls) domElements.paginationControls.innerHTML = ''; 
        return;
    }

    domElements.paginationControls.innerHTML = ''; 

    const maxPagesToShow = 5; 

    const createButton = (text, pageNum, isDisabled = false, isActive = false, isEllipsis = false) => {
        if (isEllipsis) {
            const span = document.createElement('span');
            span.className = 'page-ellipsis';
            span.textContent = '...';
            return span;
        }

        const button = document.createElement('button');
        button.innerHTML = text; 
        button.className = 'page-btn hover-effect'; 
        if (isActive) button.classList.add('active');
        if (isDisabled) button.disabled = true; 

        button.addEventListener('click', () => {
            if (!isDisabled && !isActive) {
                fetchAndDisplayCars(currentFilters, pageNum); 
                 domElements.carListDiv?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
        return button;
    };

    // Previous Button
    domElements.paginationControls.appendChild(createButton('<i class="fas fa-chevron-left"></i> Prev', currentPage - 1, currentPage === 1));

    // Page Number Buttons Logic
    if (totalPages <= maxPagesToShow + 2) { 
        for (let i = 1; i <= totalPages; i++) {
            domElements.paginationControls.appendChild(createButton(i, i, false, i === currentPage));
        }
    } else {
        domElements.paginationControls.appendChild(createButton(1, 1, false, currentPage === 1));

        if (currentPage > 3) {
            domElements.paginationControls.appendChild(createButton('...', 0, true, false, true)); 
        } else if (currentPage === 3) {
            domElements.paginationControls.appendChild(createButton(2, 2, false, false));
        }

        let startPage = Math.max(2, currentPage - 1);
        let endPage = Math.min(totalPages - 1, currentPage + 1);

        if (currentPage <= 3) { // Adjust range if near the start
             endPage = Math.min(totalPages - 1, startPage + maxPagesToShow - 3); 
         } else if (currentPage >= totalPages - 2) { // Adjust range if near the end
             startPage = Math.max(2, endPage - maxPagesToShow + 3); 
         }
         
         // Ensure startPage doesn't overlap with first page button if ellipsis isn't shown
         if (currentPage === 3) startPage = 3;
         // Ensure endPage doesn't overlap with last page button if ellipsis isn't shown
         if (currentPage === totalPages - 2) endPage = totalPages - 2;

        for (let i = startPage; i <= endPage; i++) {
            domElements.paginationControls.appendChild(createButton(i, i, false, i === currentPage));
        }

        if (currentPage < totalPages - 2) {
            domElements.paginationControls.appendChild(createButton('...', 0, true, false, true)); 
        } else if (currentPage === totalPages - 2) {
             domElements.paginationControls.appendChild(createButton(totalPages - 1, totalPages - 1, false, false));
        }

        domElements.paginationControls.appendChild(createButton(totalPages, totalPages, false, currentPage === totalPages));
    }

    // Next Button
    domElements.paginationControls.appendChild(createButton('Next <i class="fas fa-chevron-right"></i>', currentPage + 1, currentPage === totalPages));
}

/**
 * Simple currency formatter (can be expanded).
 * @param {number} amount The amount to format.
 * @param {string} currencySymbol The currency symbol (e.g., '$', 'TZS').
 * @returns {string} Formatted currency string.
 */
export function formatCurrency(amount, currencySymbol = 'TZS') { // Default to TZS
    if (typeof amount !== 'number') {
        return `${currencySymbol} --`;
    }
    // Basic formatting, assumes whole numbers for TZS
    return `${currencySymbol} ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`; 
} 