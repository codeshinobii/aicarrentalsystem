// Middleware to handle exceptions inside of async express routes
// and pass them to the express error handlers.
const asyncHandler = fn => (req, res, next) =>
    Promise
        .resolve(fn(req, res, next))
        .catch(next); // Pass errors to the next error handling middleware

module.exports = asyncHandler; 