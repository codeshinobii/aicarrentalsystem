const express = require('express');
const {
    register,
    login,
    getMe,
    logout,
    updateDetails,
    updatePassword
} = require('../controllers/auth');

const router = express.Router();

// Import protect middleware
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe); // Protect the /me route
router.get('/logout', protect, logout); // Protect the /logout route

// NEW Routes for Profile Management
router.put('/updatedetails', protect, updateDetails);
router.put('/updatepassword', protect, updatePassword);

module.exports = router; 