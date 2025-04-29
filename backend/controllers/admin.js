const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Car = require('../models/Car');

// @desc    Get Admin Dashboard Overview Data
// @route   GET /api/v1/admin/overview
// @access  Private (Admin)
exports.getAdminOverview = asyncHandler(async (req, res, next) => {

    // --- Metric Calculations ---
    // 1. Revenue (Total from completed bookings - adjust logic if needed)
    const revenueData = await Booking.aggregate([
        { $match: { booking_status: 'completed' } },
        { $group: { _id: null, totalRevenue: { $sum: '$total_cost' } } }
    ]);
    const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

    // 2. Active Bookings Count
    const activeBookingsCount = await Booking.countDocuments({ booking_status: 'active' });

    // 3. Future Bookings Count (Confirmed or Active, starting today or later)
    const futureBookingsCount = await Booking.countDocuments({
        booking_status: { $in: ['confirmed', 'active'] },
        start_date: { $gte: new Date().setHours(0, 0, 0, 0) }
    });

    // 4. Total Users Count
    const totalUsersCount = await User.countDocuments();

    // 5. Total Cars Count
    const totalCarsCount = await Car.countDocuments(); // Maybe filter out archived?

    // 6. Recent Activities (e.g., last 5 bookings)
    const recentBookings = await Booking.find()
        .sort('-createdAt')
        .limit(5)
        .populate({ path: 'user', select: 'name' })
        .populate({ path: 'car', select: 'make model' });

    // --- Prepare Response --- 
    const overviewData = {
        totalRevenue,
        activeBookingsCount,
        futureBookingsCount,
        totalUsersCount,
        totalCarsCount,
        recentBookings // Send last 5 bookings as recent activity
    };

    res.status(200).json({
        success: true,
        data: overviewData
    });
}); 