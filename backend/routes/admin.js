const express = require('express');
const {
    getAdminOverview
} = require('../controllers/admin');

const router = express.Router();

// Import middleware
const { protect, authorize } = require('../middleware/auth');

// Protect and authorize all routes in this file for admin only
router.use(protect);
router.use(authorize('admin'));

// Define routes
router.route('/overview').get(getAdminOverview);

module.exports = router; 