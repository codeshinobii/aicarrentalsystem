const jwt = require('jsonwebtoken');
const asyncHandler = require('./async');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User');

// Protect routes
exports.protect = asyncHandler(async (req, res, next) => {
    let token;

    // Check for token in Authorization header (Bearer token)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    // Or check for token in cookies
    // else if (req.cookies.token) {
    //     token = req.cookies.token;
    // }

    // Make sure token exists
    if (!token) {
        return next(new ErrorResponse('Not authorized to access this route', 401));
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Add user from payload to request object
        req.user = await User.findById(decoded.id);

        if (!req.user) {
             return next(new ErrorResponse('No user found with this id', 404));
        }

        next();
    } catch (err) {
        console.error('JWT Verification Error:', err);
        return next(new ErrorResponse('Not authorized to access this route', 401));
    }
});

// Grant access to specific roles
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) { // Ensure protect middleware ran first
             return next(new ErrorResponse('User not found, authorization cannot be checked', 500));
        }
        if (!roles.includes(req.user.role)) {
            return next(new ErrorResponse(
                `User role '${req.user.role}' is not authorized to access this route`,
                 403 // Forbidden
            ));
        }
        next();
    };
}; 