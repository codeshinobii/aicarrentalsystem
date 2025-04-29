const Car = require('../models/Car');
const Location = require('../models/Location'); // Needed for potential population
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const path = require('path'); // To handle file paths
const fs = require('fs'); // To handle file system operations (delete)

// @desc    Get all cars (with filtering)
// @route   GET /api/v1/cars
// @access  Public
exports.getCars = asyncHandler(async (req, res, next) => {
    let query;

    // Copy req.query
    const reqQuery = { ...req.query };

    // Fields to exclude from filtering (e.g., pagination, sorting - add later)
    const removeFields = ['select', 'sort', 'page', 'limit', 'adminSelect'];

    // Loop over removeFields and delete them from reqQuery
    removeFields.forEach(param => delete reqQuery[param]);

    // Create query string
    let queryStr = JSON.stringify(reqQuery);

    // Create operators ($gt, $gte, etc) - basic example for capacity
    // Example URL: /api/v1/cars?passenger_capacity[gte]=4
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    // Finding resource
    // For admin dropdown, ensure necessary fields are selected
    const isAdminDropdown = req.query.adminSelect === 'true';
    let defaultSelect = '';
    if (isAdminDropdown) {
        defaultSelect = 'make model license_plate daily_rate'; 
    }
    query = Car.find(JSON.parse(queryStr)).populate('location');

    // Select Fields 
    if (req.query.select) {
        const fields = req.query.select.split(',').join(' ');
        query = query.select(fields);
    } else if (defaultSelect) {
        query = query.select(defaultSelect); // Apply admin default select if no specific select provided
    }

    // Sort (e.g., /api/v1/cars?sort=daily_rate or sort=-daily_rate)
    if (req.query.sort) {
        const sortBy = req.query.sort.split(',').join(' ');
        query = query.sort(sortBy);
    } else {
        query = query.sort('-createdAt'); // Default sort
    }

    // Pagination (e.g., /api/v1/cars?page=2&limit=10)
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25; // Default limit 25
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Car.countDocuments(JSON.parse(queryStr)); // Count matching documents

    query = query.skip(startIndex).limit(limit);

    // Executing query
    const cars = await query;

    // Pagination result headers/metadata
    const pagination = {};
    if (endIndex < total) {
        pagination.next = {
            page: page + 1,
            limit
        };
    }
    if (startIndex > 0) {
        pagination.prev = {
            page: page - 1,
            limit
        };
    }

    res.status(200).json({
        success: true,
        count: cars.length,
        total, // Add total count
        pagination,
        data: cars
    });
});

// @desc    Get single car by ID
// @route   GET /api/v1/cars/:id
// @access  Public
exports.getCar = asyncHandler(async (req, res, next) => {
    const car = await Car.findById(req.params.id).populate('location');

    if (!car) {
        return next(
            new ErrorResponse(`Car not found with id of ${req.params.id}`, 404)
        );
    }

    res.status(200).json({
        success: true,
        data: car
    });
});

// @desc    Create new car
// @route   POST /api/v1/cars
// @access  Private (Admin)
exports.createCar = asyncHandler(async (req, res, next) => {
    // TODO: Add validation to ensure the referenced location exists
    // TODO: Consider adding the user who created the car (req.user.id)?

    const car = await Car.create(req.body);

    res.status(201).json({
        success: true,
        data: car
    });
});

// @desc    Update car by ID
// @route   PUT /api/v1/cars/:id
// @access  Private (Admin)
exports.updateCar = asyncHandler(async (req, res, next) => {
    let car = await Car.findById(req.params.id);

    if (!car) {
        return next(
            new ErrorResponse(`Car not found with id of ${req.params.id}`, 404)
        );
    }

    // TODO: Add authorization check: Ensure user is admin or maybe owner if applicable later?
    // We are handling the role check in the route middleware, but could add more checks here.

    car = await Car.findByIdAndUpdate(req.params.id, req.body, {
        new: true, // Return the modified document
        runValidators: true // Run schema validators on update
    });

    res.status(200).json({
        success: true,
        data: car
    });
});

// @desc    Delete car by ID
// @route   DELETE /api/v1/cars/:id
// @access  Private (Admin)
exports.deleteCar = asyncHandler(async (req, res, next) => {
    const car = await Car.findById(req.params.id);

    if (!car) {
        return next(
            new ErrorResponse(`Car not found with id of ${req.params.id}`, 404)
        );
    }

    // TODO: Add authorization check (handled in route middleware)
    // TODO: Consider what happens to bookings associated with this car? Delete them? Mark them cancelled?

    await car.deleteOne(); // Use deleteOne() in Mongoose v6+

    res.status(200).json({
        success: true,
        data: {} // Send empty object on successful deletion
    });
});

// @desc    Upload photos for a car
// @route   POST /api/v1/cars/:id/photos
// @access  Private (Admin)
exports.uploadCarPhotos = asyncHandler(async (req, res, next) => {
    console.log('--- Entering uploadCarPhotos ---'.cyan);
    console.log('Car ID:', req.params.id);
    console.log('Files received:', req.files ? req.files.length : 'None');

    // Check if req.files exists and has content
    if (!req.files || req.files.length === 0) {
        console.log('No files array found on req or empty array.');
        // It seems multer didn't attach files or they were filtered out.
        // Check multer logs or configuration if this happens unexpectedly.
        return next(new ErrorResponse(`Please upload at least one valid image file`, 400));
    }

    const car = await Car.findById(req.params.id);

    if (!car) {
        console.log('Car not found, calling next()'.yellow);
        // Clean up uploaded files if car not found? Optional.
        req.files.forEach(file => {
            fs.unlink(file.path, err => { if(err) console.error(`Error deleting orphaned file ${file.path}: ${err.message}`.red); });
        });
        return next(
            new ErrorResponse(`Car not found with id of ${req.params.id}`, 404)
        );
    }
    console.log('Car found:', car._id);
    console.log('Files validated, count:', req.files.length);

    const files = req.files;

    // Construct URLs for the uploaded files
    // Assumes files are served statically from /uploads/cars/
    const imageUrls = files.map(file => `/uploads/cars/${file.filename}`);
    console.log('Generated Image URLs:', imageUrls);

    // Add new URLs to the existing ones (or create array if it doesn't exist)
    const updatedImageUrls = [...(car.imageUrls || []), ...imageUrls];
    console.log('Updated Image URL array:', updatedImageUrls);

    console.log('Attempting to update car document...'.magenta);
    try {
        await Car.findByIdAndUpdate(req.params.id, {
            imageUrls: updatedImageUrls
        }, { new: true, runValidators: false }); // Added options for safety
        console.log('Car document updated successfully.'.green);
    } catch (dbError) {
         console.error('Database update error after upload:'.red, dbError);
         // Clean up uploaded files as DB update failed
         files.forEach(file => {
            fs.unlink(file.path, err => { if(err) console.error(`Error deleting file ${file.path} after DB error: ${err.message}`.red); });
         });
         return next(new ErrorResponse(`Failed to save image references to database: ${dbError.message}`, 500));
    }

    console.log('Sending success response (204 No Content)...'.cyan);
    // Send 204 No Content instead of JSON body for testing
    // res.sendStatus(204); 

    // Original response:
     res.status(200).json({
         success: true,
         count: files.length,
         data: updatedImageUrls // Return all image URLs
     });
     console.log('--- Exiting uploadCarPhotos (Response Sent) ---'.cyan); 
});

// @desc    Delete a specific photo for a car
// @route   DELETE /api/v1/cars/:id/photos/:imageName
// @access  Private (Admin)
exports.deleteCarPhoto = asyncHandler(async (req, res, next) => {
    const car = await Car.findById(req.params.id);
    const imageName = req.params.imageName;

    if (!car) {
        return next(
            new ErrorResponse(`Car not found with id of ${req.params.id}`, 404)
        );
    }

    // Find the full URL to remove from the array
    const imageUrlToDelete = `/uploads/cars/${imageName}`;
    const currentImageUrls = car.imageUrls || [];

    if (!currentImageUrls.includes(imageUrlToDelete)) {
         return next(
            new ErrorResponse(`Image ${imageName} not found for car ${req.params.id}`, 404)
        );
    }

    // Construct the physical file path
    const filePath = path.join(__dirname, '../public/uploads/cars', imageName);

    // Remove URL from array
    const updatedImageUrls = currentImageUrls.filter(url => url !== imageUrlToDelete);

    try {
        // Delete the physical file
        fs.unlinkSync(filePath);
        console.log(`Deleted file: ${filePath}`);

        // Update the car document
        await Car.findByIdAndUpdate(req.params.id, {
            imageUrls: updatedImageUrls
        });

        res.status(200).json({
            success: true,
            data: updatedImageUrls // Return remaining image URLs
        });

    } catch (err) {
        console.error(`Error deleting file ${filePath}:`, err);
        return next(
            new ErrorResponse(`Error deleting image file: ${err.message}`, 500)
        );
    }
});