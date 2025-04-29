const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    car: {
        type: mongoose.Schema.ObjectId,
        ref: 'Car',
        required: true
    },
    start_date: {
        type: Date,
        required: [true, 'Please add a start date']
    },
    end_date: {
        type: Date,
        required: [true, 'Please add an end date']
    },
    total_cost: {
        type: Number,
        required: true
        // We might calculate this on the server before saving
    },
    booking_status: {
        type: String,
        enum: ['pending_payment', 'confirmed', 'active', 'completed', 'cancelled'],
        default: 'pending_payment'
    },
    pickup_location: {
        type: mongoose.Schema.ObjectId,
        ref: 'Location',
        required: true
    },
    dropoff_location: {
        type: mongoose.Schema.ObjectId,
        ref: 'Location',
        required: true
    },
    // Add paymentIntentId later for linking with Stripe/Payment Gateway
    // paymentIntentId: {
    //     type: String
    // },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// TODO: Add validation to ensure end_date is after start_date
// TODO: Add check to ensure car is available for the selected dates before saving

module.exports = mongoose.model('Booking', BookingSchema); 