const Booking = require('../models/Booking');
const Car = require('../models/Car');
const User = require('../models/User'); // Potentially needed for checks
const Location = require('../models/Location'); // Potentially needed for checks
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Get all bookings (admin) or own bookings (customer)
// @route   GET /api/v1/bookings
// @access  Private
exports.getBookings = asyncHandler(async (req, res, next) => {
    let query;
    let countQuery = Booking.find(); // Initialize count query to potentially get total across all

    // Determine base query based on role
    if (req.user.role === 'admin') {
        // Admin sees all bookings - build query with population
        query = Booking.find()
            .populate({ path: 'car', select: 'make model license_plate' })
            .populate({ path: 'user', select: 'name email' })
            .populate({ path: 'pickup_location', select: 'address city' })
            .populate({ path: 'dropoff_location', select: 'address city' });
        // Admin count query starts with all bookings
        countQuery = Booking.find();
    } else {
        // Customer sees only their own bookings
        query = Booking.find({ user: req.user.id })
            .populate({ path: 'car', select: 'make model license_plate year' })
            .populate({ path: 'pickup_location', select: 'address city' })
            .populate({ path: 'dropoff_location', select: 'address city' });
        // Customer count query starts filtered by user
        countQuery = Booking.find({ user: req.user.id });
    }

    // --- Apply additional filters to BOTH query and countQuery ---
    const filterConditions = {};

    // Add specific filters from req.query
    if (req.query.booking_status) {
        filterConditions.booking_status = req.query.booking_status;
    }
    // TODO: Add more filters here (user, car, date) and add them to filterConditions
    // Example for admin filtering by user:
    // if (req.user.role === 'admin' && req.query.userId) {
    //     filterConditions.user = req.query.userId;
    // }

    // Apply the collected filters
    query = query.where(filterConditions);
    countQuery = countQuery.where(filterConditions);

    // --- Pagination ---
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 100; // Default limit 100 for admin
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    // Get total count using the countQuery (which includes filters)
    const total = await countQuery.countDocuments();

    query = query.skip(startIndex).limit(limit);

    // Sorting
    if (req.query.sort) {
        const sortBy = req.query.sort.split(',').join(' ');
        query = query.sort(sortBy);
    } else {
        query = query.sort('-startDate'); // Default sort by most recent start date
    }

    // Executing query
    const bookings = await query;

    // Pagination result
    const pagination = {};
    if (endIndex < total) {
        pagination.next = { page: page + 1, limit };
    }
    if (startIndex > 0) {
        pagination.prev = { page: page - 1, limit };
    }

    res.status(200).json({
        success: true,
        count: bookings.length,
        total,
        pagination,
        data: bookings
    });
});

// @desc    Get single booking by ID
// @route   GET /api/v1/bookings/:id
// @access  Private
exports.getBooking = asyncHandler(async (req, res, next) => {
    const booking = await Booking.findById(req.params.id)
        .populate({ path: 'car' })
        .populate({ path: 'user', select: 'name email _id' })
        .populate({ path: 'pickup_location' })
        .populate({ path: 'dropoff_location' });

    if (!booking) {
        return next(
            new ErrorResponse(`Booking not found with id of ${req.params.id}`, 404)
        );
    }

    // Authorization Check: Ensure user owns the booking or is an admin
    if (booking.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
        return next(
            new ErrorResponse('Not authorized to view this booking', 401)
        );
    }

    res.status(200).json({
        success: true,
        data: booking
    });
});

// @desc    Create a new booking
// @route   POST /api/v1/bookings
// @access  Private (Customer/Admin)
exports.createBooking = asyncHandler(async (req, res, next) => {
    // If admin creates, they provide user ID in body, otherwise use req.user.id
    const userId = req.user.role === 'admin' ? req.body.user : req.user.id;
    const { car: carId, startDate, endDate, pickupLocation: pickupLocationId, dropoffLocation: dropoffLocationId } = req.body;

    // --- Validation --- 
    if (!userId || !carId || !startDate || !endDate || !pickupLocationId || !dropoffLocationId) {
        return next(new ErrorResponse('Missing required booking information (User, Car, Dates, Locations)', 400));
    }

    // Check if resources exist
    const user = await User.findById(userId);
    if (!user) {
        return next(new ErrorResponse(`User not found with id ${userId}`, 404));
    }
    const car = await Car.findById(carId);
    if (!car) {
        return next(new ErrorResponse(`Car not found with id ${carId}`, 404));
    }
    const pickupLocation = await Location.findById(pickupLocationId);
    if (!pickupLocation) {
        return next(new ErrorResponse(`Pickup location not found with id ${pickupLocationId}`, 404));
    }
    const dropoffLocation = await Location.findById(dropoffLocationId);
    if (!dropoffLocation) {
        return next(new ErrorResponse(`Dropoff location not found with id ${dropoffLocationId}`, 404));
    }

    // Date validation
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return next(new ErrorResponse('Invalid date format provided', 400));
    }
    if (start >= end) {
         return next(new ErrorResponse('Start date must be before end date', 400));
    }
    // Allow past dates for admin? For now, keep future check.
    if (start < new Date().setHours(0,0,0,0) && req.user.role !== 'admin') { // Only enforce for non-admins
         return next(new ErrorResponse('Start date cannot be in the past for customer bookings', 400));
    }

    // Check Car Availability
    const overlappingBookings = await Booking.find({
        _id: { $ne: null }, // Exclude potential self-conflict during updates
        car: carId,
        booking_status: { $in: ['confirmed', 'active'] }, 
        $or: [
            { startDate: { $lt: end, $gte: start } }, 
            { endDate: { $gt: start, $lte: end } }, 
            { startDate: { $lte: start }, endDate: { $gte: end } } 
        ]
    });

    if (overlappingBookings.length > 0) {
        return next(new ErrorResponse(`Car ${car.make} ${car.model} is not available for the selected dates`, 400));
    }

    // --- Calculation --- 
    const durationDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24))); // Ensure at least 1 day
    // Use provided cost if admin sets it, otherwise calculate
    const totalCost = (req.user.role === 'admin' && req.body.total_cost !== undefined) 
                      ? parseFloat(req.body.total_cost)
                      : durationDays * car.daily_rate;

    // --- Create Booking --- 
    const booking = await Booking.create({
        user: userId,
        car: carId,
        start_date: start,
        end_date: end,
        total_cost: totalCost,
        pickup_location: pickupLocationId,
        dropoff_location: dropoffLocationId,
        // Admin can set status directly, otherwise default
        booking_status: (req.user.role === 'admin' && req.body.booking_status) 
                        ? req.body.booking_status 
                        : 'pending_payment' 
    });

    res.status(201).json({
        success: true,
        data: booking
    });
});

// @desc    Update a booking (Admin only)
// @route   PUT /api/v1/bookings/:id
// @access  Private (Admin)
exports.updateBooking = asyncHandler(async (req, res, next) => {
    const bookingId = req.params.id;
    let booking = await Booking.findById(bookingId);

    if (!booking) {
        return next(
            new ErrorResponse(`Booking not found with id of ${bookingId}`, 404)
        );
    }

    const { user: userId, car: carId, startDate, endDate, pickupLocation: pickupLocationId, dropoffLocation: dropoffLocationId, total_cost, booking_status } = req.body;

    // --- Validation --- 
    if (!userId || !carId || !startDate || !endDate || !pickupLocationId || !dropoffLocationId || !booking_status) {
        return next(new ErrorResponse('Missing required booking information (User, Car, Dates, Locations, Status)', 400));
    }

    // Check if resources exist
    const user = await User.findById(userId);
    if (!user) return next(new ErrorResponse(`User not found with id ${userId}`, 404));
    const car = await Car.findById(carId);
    if (!car) return next(new ErrorResponse(`Car not found with id ${carId}`, 404));
    const pickupLocation = await Location.findById(pickupLocationId);
    if (!pickupLocation) return next(new ErrorResponse(`Pickup location not found with id ${pickupLocationId}`, 404));
    const dropoffLocation = await Location.findById(dropoffLocationId);
    if (!dropoffLocation) return next(new ErrorResponse(`Dropoff location not found with id ${dropoffLocationId}`, 404));

    // Date validation
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return next(new ErrorResponse('Invalid date format provided', 400));
    }
    if (start >= end) {
         return next(new ErrorResponse('Start date must be before end date', 400));
    }

    // Check Car Availability (excluding current booking)
    const overlappingBookings = await Booking.find({
        _id: { $ne: bookingId }, // Exclude self
        car: carId,
        booking_status: { $in: ['confirmed', 'active'] }, 
        $or: [
            { startDate: { $lt: end, $gte: start } }, 
            { endDate: { $gt: start, $lte: end } }, 
            { startDate: { $lte: start }, endDate: { $gte: end } } 
        ]
    });

    if (overlappingBookings.length > 0) {
        return next(new ErrorResponse(`Car ${car.make} ${car.model} is not available for the selected dates`, 400));
    }

    // --- Cost Calculation (Admin can override) ---
    const durationDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    const calculatedCost = durationDays * car.daily_rate;
    const finalCost = (total_cost !== undefined && total_cost !== null && total_cost !== '') 
                       ? parseFloat(total_cost)
                       : calculatedCost;

    // Prepare update data
    const updateData = {
        user: userId,
        car: carId,
        startDate: start,
        endDate: end,
        pickup_location: pickupLocationId,
        dropoff_location: dropoffLocationId,
        booking_status: booking_status,
        total_cost: finalCost
    };

    booking = await Booking.findByIdAndUpdate(bookingId, updateData, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        success: true,
        data: booking
    });
});

// @desc    Delete a booking (Admin only - essentially cancels)
// @route   DELETE /api/v1/bookings/:id
// @access  Private (Admin)
exports.deleteBooking = asyncHandler(async (req, res, next) => {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
        return next(
            new ErrorResponse(`Booking not found with id of ${req.params.id}`, 404)
        );
    }

    // Consider implications: associated payments? car availability?
    // Simple delete for now.
    await booking.deleteOne();

    res.status(200).json({
        success: true,
        data: {} // Indicate successful deletion
    });
});

// @desc    Confirm payment for a booking (Simulated)
// @route   POST /api/v1/bookings/:id/confirm-payment
// @access  Private (User for own booking, or Admin)
exports.confirmBookingPayment = asyncHandler(async (req, res, next) => {
    const bookingId = req.params.id;
    const booking = await Booking.findById(bookingId);

    if (!booking) {
        return next(
            new ErrorResponse(`Booking not found with id of ${bookingId}`, 404)
        );
    }

    // Authorization: Ensure user owns the booking or is an admin
    if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return next(
            new ErrorResponse('Not authorized to update this booking', 401)
        );
    }

    // Check if booking is actually pending payment
    if (booking.booking_status !== 'pending_payment') {
        return next(
            new ErrorResponse(`Booking status is already '${booking.booking_status}', cannot confirm payment.`, 400)
        );
    }

    // Update status to confirmed
    booking.booking_status = 'confirmed';
    await booking.save();

    res.status(200).json({
        success: true,
        data: booking // Return the updated booking
    });
});

// We will add getBookings, getBooking, updateBooking, deleteBooking later 