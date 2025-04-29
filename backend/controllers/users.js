const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private (Admin)
exports.getUsers = asyncHandler(async (req, res, next) => {
    // For admin dropdowns, fetch all users with minimal fields
    // Increase limit significantly for this purpose
    // TODO: Implement search/pagination if user list becomes very large
    const users = await User.find().select('name email role').sort('name').limit(1000);
    
    res.status(200).json({
        success: true,
        count: users.length,
        // Remove pagination for this simplified fetch
        // total, 
        // pagination,
        data: users
    });
});

// @desc    Get single user by ID
// @route   GET /api/v1/users/:id
// @access  Private (Admin)
exports.getUser = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        return next(
            new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
        );
    }

    res.status(200).json({
        success: true,
        data: user
    });
});

// @desc    Create user (Admin only - registration is public)
// @route   POST /api/v1/users
// @access  Private (Admin)
exports.createUser = asyncHandler(async (req, res, next) => {
    // Admins can create users directly, including setting roles
    // Password will be hashed by the pre-save hook in the User model
    const user = await User.create(req.body);

    res.status(201).json({
        success: true,
        data: user
    });
});

// @desc    Update user by ID (Admin only)
// @route   PUT /api/v1/users/:id
// @access  Private (Admin)
exports.updateUser = asyncHandler(async (req, res, next) => {
    // Admins can update user details, including email, name, role
    // Exclude password from direct update here; handle separately if needed
    const { password, ...updateData } = req.body;
    if (password) {
        // Optional: Add a separate route or logic for admin password resets if required
        console.warn('Password cannot be updated via this route.');
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true
    });

    if (!user) {
        return next(
            new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
        );
    }

    res.status(200).json({
        success: true,
        data: user
    });
});

// @desc    Delete user by ID (Admin only)
// @route   DELETE /api/v1/users/:id
// @access  Private (Admin)
exports.deleteUser = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        return next(
            new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
        );
    }

    // TODO: Consider what happens to bookings associated with this user?
    await user.deleteOne();

    res.status(200).json({
        success: true,
        data: {} // Indicate successful deletion
    });
});

// @desc    Update AI Preferences for the logged-in user
// @route   POST /api/v1/users/me/ai-preferences (or similar)
// @access  Private
exports.updateAiPreferences = asyncHandler(async (req, res, next) => {
    // Get user from the protect middleware
    const user = await User.findById(req.user.id);

    if (!user) {
        // This shouldn't happen if protect middleware is working
        return next(new ErrorResponse('User not found', 404));
    }

    // Extract allowed preference fields from the request body
    const { defaultPassengers, preferredCarType, typicalUseCase, fuelPreference } = req.body;

    // Construct the update object, handling null/undefined values
    const preferencesToUpdate = {
        defaultPassengers: defaultPassengers !== undefined ? defaultPassengers : user.aiPreferences.defaultPassengers,
        preferredCarType: preferredCarType !== undefined ? preferredCarType : user.aiPreferences.preferredCarType,
        typicalUseCase: typicalUseCase !== undefined ? typicalUseCase : user.aiPreferences.typicalUseCase,
        fuelPreference: fuelPreference !== undefined ? fuelPreference : user.aiPreferences.fuelPreference,
    };

    // Update the user document
    // Using user.save() allows for middleware (like validation) on the aiPreferences subdocument if added later
    user.aiPreferences = preferencesToUpdate;
    await user.save();

    res.status(200).json({
        success: true,
        data: user.aiPreferences // Return the updated preferences
    });
}); 