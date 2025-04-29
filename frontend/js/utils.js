// --- Utility Functions ---

/**
 * Formats a date string into a more readable format.
 * @param {string} dateString - The date string to format.
 * @returns {string} Formatted date or original string if parsing fails.
 */
export function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (e) {
        return dateString; // Return original if parsing fails
    }
}

/**
 * Validates an email address format.
 * @param {string} email - The email string to validate.
 * @returns {boolean} True if the email format is valid, false otherwise.
 */
export function validateEmail(email) {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/;
    return re.test(String(email).toLowerCase());
}

/**
 * Displays an inline validation or general error message for a form element.
 * @param {HTMLElement} element - The HTML element where the message should be displayed.
 * @param {string} message - The error message text.
 */
export function displayError(element, message) {
    if (!element) return;
    element.textContent = message;
    element.style.display = 'block'; // Make sure it's visible
    element.classList.add('quantum-error', 'show'); // Add animation/show class
     // Ensure parent input gets invalid class if needed
     const input = element.closest('.form-group')?.querySelector('input, select, textarea');
     input?.classList.add('is-invalid');
     input?.classList.remove('is-valid');
}

/**
 * Clears an inline error message.
 * @param {HTMLElement} element - The HTML element displaying the error.
 */
export function clearError(element) {
     if (!element) return;
    element.textContent = '';
    element.style.display = 'none'; // Hide it
    element.classList.remove('quantum-error', 'show');
    // Ensure parent input removes invalid class if needed
    const input = element.closest('.form-group')?.querySelector('input, select, textarea');
    input?.classList.remove('is-invalid');
    // Don't automatically add 'is-valid' here, let validation logic handle it
}

/**
 * Displays an inline success message, typically after form submission.
 * @param {HTMLElement} element - The HTML element where the message should be displayed.
 * @param {string} message - The success message text.
 */
export function displaySuccess(element, message) {
    if (!element) return;
    element.textContent = message;
    element.style.display = 'block';
     element.classList.remove('error-message'); // Ensure it's not styled as error
    element.classList.add('success-message', 'quantum-success', 'show');
    // Clear after a delay
     setTimeout(() => clearSuccess(element), 4000);
}

/**
 * Clears an inline success message.
 * @param {HTMLElement} element - The HTML element displaying the success message.
 */
export function clearSuccess(element) {
     if (!element) return;
     element.classList.remove('show');
     // Optionally remove text after fade out
     setTimeout(() => {
         element.textContent = '';
         element.style.display = 'none';
         element.classList.remove('quantum-success');
     }, 300); // Match CSS transition time
}

/**
 * Disables all interactive elements within a form.
 * @param {HTMLFormElement} formElement - The form element to disable.
 */
export function disableForm(formElement) {
    formElement.querySelectorAll('input, select, button, textarea').forEach(el => {
        el.disabled = true;
    });
     formElement.classList.add('form-disabled'); // Optional class for styling
}


// --- Form Validation Setup ---

// Import necessary DOM elements (assuming they are exported from ui.js or passed)
// This dependency will be resolved later when ui.js is created.
// For now, we might need to pass domElements if needed, or adjust later.
// import { domElements } from './ui.js'; 

/**
 * Sets up real-time validation listeners for forms marked with novalidate.
 */
export function setupFormValidation() {
    const forms = document.querySelectorAll('form[novalidate]'); // Select forms with novalidate

    forms.forEach(form => {
        const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
        const submitButton = form.querySelector('button[type="submit"]');

        inputs.forEach(input => {
            input.addEventListener('input', () => validateInput(input)); // Validate on input
            input.addEventListener('blur', () => validateInput(input)); // Validate on blur

            // Quantum Focus Effect (optional) - Could be moved to ui.js if preferred
            input.addEventListener('focus', () => input.closest('.form-group')?.classList.add('quantum-focus'));
            input.addEventListener('blur', () => input.closest('.form-group')?.classList.remove('quantum-focus'));
        });

        form.addEventListener('submit', (e) => {
            // Client-side validation check before allowing default submission OR calling JS handlers
            let isFormValid = true;
            inputs.forEach(input => {
                if (!validateInput(input)) {
                    isFormValid = false;
                }
            });

            if (!isFormValid) {
                e.preventDefault(); // Prevent submission if client-side validation fails
                // We need displayToast here - import it later from ui.js
                // displayToast('Please correct the highlighted fields.', 'error'); 
                console.error('Form validation failed. Please correct highlighted fields.'); // Placeholder
                
                const firstInvalid = form.querySelector('.is-invalid');
                firstInvalid?.focus();
                firstInvalid?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } 
            // If form IS valid, we let the default event proceed OR let the specific JS handler 
            // attached elsewhere (e.g., in main.js or feature modules) handle the e.preventDefault()
            // and API call logic. We don't add the spinner/disabled state here anymore.
        });
    });
}

/**
 * Validates a single input element based on its attributes.
 * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} input - The input element to validate.
 * @returns {boolean} True if the input is valid, false otherwise.
 */
function validateInput(input) { // Keep private to this module unless needed elsewhere
    const formGroup = input.closest('.form-group');
    const validationMessageElement = formGroup?.querySelector('.validation-message');
    let isValid = true;
    let message = '';

    input.classList.remove('is-invalid', 'is-valid');

    // Check required
    if (input.hasAttribute('required') && !input.value.trim()) {
        isValid = false;
        message = 'This field is required.';
    }
    // Check email type
    else if (input.type === 'email' && input.value.trim() && !validateEmail(input.value.trim())) {
        isValid = false;
        message = 'Please enter a valid email address.';
    }
    // Check minlength
    else if (input.hasAttribute('minlength') && input.value.trim().length < parseInt(input.getAttribute('minlength'), 10)) {
        isValid = false;
        message = `Minimum length is ${input.getAttribute('minlength')} characters.`;
    }
     // Check password confirmation (example - needs specific IDs or better DOM traversal)
    else if (input.id === 'confirm-password') {
         const newPasswordInput = input.form?.querySelector('#new-password'); // Find within the same form
         if (newPasswordInput && input.value !== newPasswordInput.value) {
             isValid = false;
             message = 'Passwords do not match.';
         }
    }
     // Check date order (example - needs specific IDs or better DOM traversal)
     else if (input.id === 'booking-end-date') {
          const startDateInput = input.form?.querySelector('#booking-start-date');
         if (startDateInput && input.value && startDateInput.value && new Date(input.value) < new Date(startDateInput.value)) {
             isValid = false;
             message = 'End date cannot be before start date.';
         }
     }
     // Check pattern (e.g., for VIN)
     else if (input.hasAttribute('pattern') && input.value.trim() && !new RegExp(input.getAttribute('pattern')).test(input.value.trim())) {
         isValid = false;
         message = input.getAttribute('title') || 'Invalid format.'; // Use title attribute for message
     }
     // Check min/max for numbers
     else if (input.type === 'number') {
         const value = parseFloat(input.value);
         const min = input.hasAttribute('min') ? parseFloat(input.getAttribute('min')) : null;
         const max = input.hasAttribute('max') ? parseFloat(input.getAttribute('max')) : null;
         if (min !== null && value < min) {
             isValid = false;
             message = `Value must be at least ${min}.`;
         } else if (max !== null && value > max) {
             isValid = false;
             message = `Value must be no more than ${max}.`;
         }
     }

    if (!isValid) {
        input.classList.add('is-invalid');
        if (validationMessageElement) {
             displayError(validationMessageElement, message); // Use enhanced displayError
        }
    } else if (input.value.trim()) { // Only add 'is-valid' if not empty and passes checks
        input.classList.add('is-valid');
         if (validationMessageElement) {
             clearError(validationMessageElement); // Clear any previous error message
         }
    } else {
        // Input is empty but not required (or failed required check above), clear validation state
         if (validationMessageElement) {
             clearError(validationMessageElement);
         }
    }

    return isValid;
} 