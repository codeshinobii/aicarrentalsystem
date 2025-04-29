const express = require('express');
const {
    getLocations,
    getLocation,
    createLocation,
    updateLocation,
    deleteLocation
} = require('../controllers/locations');

const router = express.Router();

// Import middleware
const { protect, authorize } = require('../middleware/auth');

// Public route to get all locations
router.route('/')
    .get(getLocations) // Public access to get locations
    .post(protect, authorize('admin'), createLocation); // Admin only to create

// Routes for specific location ID (add later)
router.route('/:id')
    .get(getLocation) // Add route to get single location
    .put(protect, authorize('admin'), updateLocation) // Admin only to update
    .delete(protect, authorize('admin'), deleteLocation); // Admin only to delete

module.exports = router; 