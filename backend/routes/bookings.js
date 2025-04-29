const express = require('express');
const {
    createBooking,
    getBookings,
    getBooking,
    updateBooking,
    deleteBooking,
    confirmBookingPayment
} = require('../controllers/bookings');

const router = express.Router();

// Import middleware
const { protect, authorize } = require('../middleware/auth');

// Apply protect middleware to all routes below
router.use(protect);

// Route for creating a booking
// Only logged-in users (customers) can create bookings
router.route('/')
    .post(createBooking)
    .get(getBookings); // Protect route - logic inside controller handles roles

// Route to confirm payment (simulated)
// Accessible by logged-in users (for their own booking) or admins
router.route('/:id/confirm-payment').post(confirmBookingPayment);

// Routes for specific booking ID (add later)
router.route('/:id')
    .get(getBooking)
    .put(authorize('admin'), updateBooking)
    .delete(authorize('admin'), deleteBooking); // Protect route - logic inside controller handles ownership/admin

module.exports = router; 