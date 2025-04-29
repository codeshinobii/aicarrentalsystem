const Location = require('../models/Location');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Get all locations
// @route   GET /api/v1/locations
// @access  Public
exports.getLocations = asyncHandler(async (req, res, next) => {
    // Simple fetch all for now, could add filtering/pagination later if needed
    const locations = await Location.find().sort('city'); // Sort by city for dropdown

    res.status(200).json({
        success: true,
        count: locations.length,
        data: locations
    });
});

// @desc    Get single location by ID
// @route   GET /api/v1/locations/:id
// @access  Public (or Private/Admin if needed)
exports.getLocation = asyncHandler(async (req, res, next) => {
    const location = await Location.findById(req.params.id);
    if (!location) {
        return next(new ErrorResponse(`Location not found with id of ${req.params.id}`, 404));
    }
    res.status(200).json({
        success: true,
        data: location
    });
});

// @desc    Create new location
// @route   POST /api/v1/locations
// @access  Private (Admin)
exports.createLocation = asyncHandler(async (req, res, next) => {
    const location = await Location.create(req.body);
    res.status(201).json({
        success: true,
        data: location
    });
});

// @desc    Update location by ID
// @route   PUT /api/v1/locations/:id
// @access  Private (Admin)
exports.updateLocation = asyncHandler(async (req, res, next) => {
    let location = await Location.findById(req.params.id);
    if (!location) {
        return next(new ErrorResponse(`Location not found with id of ${req.params.id}`, 404));
    }

    location = await Location.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        success: true,
        data: location
    });
});

// @desc    Delete location by ID
// @route   DELETE /api/v1/locations/:id
// @access  Private (Admin)
exports.deleteLocation = asyncHandler(async (req, res, next) => {
    const location = await Location.findById(req.params.id);
    if (!location) {
        return next(new ErrorResponse(`Location not found with id of ${req.params.id}`, 404));
    }

    // TODO: Consider what happens to Cars assigned to this location?
    // Maybe prevent deletion if cars are assigned?
    await location.deleteOne();

    res.status(200).json({
        success: true,
        data: {}
    });
});

// TODO: Add create, update, delete location endpoints later (likely admin only) 