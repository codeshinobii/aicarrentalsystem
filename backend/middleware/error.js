const ErrorResponse = require('../utils/errorResponse');

const errorHandler = (err, req, res, next) => {
    let error = { ...err }; // Create a copy of the error object

    error.message = err.message; // Copy message explicitly

    // Log to console for the developer
    console.error('ERROR STACK:', err.stack.red); // You might need a colors package like 'colors' for .red
    console.error('ERROR MESSAGE:', err);

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        const message = `Resource not found with id of ${err.value}`; // More specific message
        error = new ErrorResponse(message, 404);
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        const message = `Duplicate field value entered for '${field}'. Please use another value.`;
        error = new ErrorResponse(message, 400);
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(val => val.message);
        const message = `Invalid input data: ${messages.join('. ')}`;
        error = new ErrorResponse(message, 400);
    }

    // Handle JWT errors (add more specific checks if needed)
    if (err.name === 'JsonWebTokenError') {
        const message = 'Invalid token. Please log in again.';
        error = new ErrorResponse(message, 401);
    }
    if (err.name === 'TokenExpiredError') {
        const message = 'Your session has expired. Please log in again.';
        error = new ErrorResponse(message, 401);
    }

    res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Server Error'
    });
};

module.exports = errorHandler; 