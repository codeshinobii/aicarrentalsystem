const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse'); // We will create this utility next
const asyncHandler = require('../middleware/async'); // We will create this utility next

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
    // Only get name, email, password from body
    const { name, email, password } = req.body; 

    // Create user (role will default to 'customer' based on the User model)
    const user = await User.create({
        name,
        email,
        password
        // Let the model handle the default role
    });

    sendTokenResponse(user, 200, res);
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
        return next(new ErrorResponse('Please provide an email and password', 400));
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password'); // Need to explicitly select password

    if (!user) {
        return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
        return next(new ErrorResponse('Invalid credentials', 401));
    }

    sendTokenResponse(user, 200, res);
});

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
    // Create token
    const token = user.getSignedJwtToken();

    const options = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
        httpOnly: true // Cookie cannot be accessed or modified by the browser JavaScript
    };

    if (process.env.NODE_ENV === 'production') {
        options.secure = true; // Only send cookie over HTTPS
    }

    res
        .status(statusCode)
        .cookie('token', token, options) // Set cookie
        .json({
            success: true,
            token
            // Optionally send user data too, but exclude password
            // data: { _id: user._id, name: user.name, email: user.email, role: user.role }
        });
};

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
    // req.user is set by the protect middleware
    const user = await User.findById(req.user.id);

    if (!user) {
         return next(new ErrorResponse('User not found', 404));
    }

    res.status(200).json({ 
        success: true, 
        data: user 
    });
});

// @desc    Log user out / clear cookie
// @route   GET /api/v1/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res, next) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000), // Expire in 10 seconds
        httpOnly: true
    });

    res.status(200).json({
        success: true,
        data: {}
    });
});

// @desc      Update user details (name, email)
// @route     PUT /api/v1/auth/updatedetails
// @access    Private
exports.updateDetails = asyncHandler(async (req, res, next) => {
    const { name, email } = req.body;

    // Find user by ID from token
    const user = await User.findById(req.user.id);

    if (!user) {
        return next(new ErrorResponse('User not found', 404));
    }

    // Basic validation (can add more specific email validation if needed)
    if (!name || !email) {
        return next(new ErrorResponse('Please provide name and email', 400));
    }

    // Update fields
    user.name = name;
    user.email = email;

    await user.save();

    // Send back updated user data
    res.status(200).json({
        success: true,
        data: user
    });
});

// @desc      Update user password
// @route     PUT /api/v1/auth/updatepassword
// @access    Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;

    // Basic validation
    if (!currentPassword || !newPassword) {
        return next(new ErrorResponse('Please provide current and new password', 400));
    }

    // Find user by ID, ensuring password field is selected
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
        // This shouldn't happen if protect middleware is working, but good practice
        return next(new ErrorResponse('User not found', 404));
    }

    // Check if current password matches
    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
        return next(new ErrorResponse('Invalid current password', 401));
    }

    // Set new password (pre-save hook in User model should hash it)
    user.password = newPassword;
    await user.save();

    // Password updated successfully, send back a new token
    sendTokenResponse(user, 200, res);
});

// We might add forgotPassword, resetPassword later 