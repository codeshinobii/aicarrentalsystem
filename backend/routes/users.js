const express = require('express');
const {
    getUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    updateAiPreferences
} = require('../controllers/users');

// Include authentication middleware
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply protect middleware to all routes below this point
router.use(protect);

// --- Routes accessible to LOGGED-IN users --- 
router.route('/me/ai-preferences').put(updateAiPreferences);

// --- Routes accessible ONLY to ADMINS ---
router.use(authorize('admin'));

router.route('/')
    .get(getUsers)
    .post(createUser);

router.route('/:id')
    .get(getUser)
    .put(updateUser)
    .delete(deleteUser);

module.exports = router; 