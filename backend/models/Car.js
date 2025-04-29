const mongoose = require('mongoose');

const CarSchema = new mongoose.Schema({
    make: {
        type: String,
        required: [true, 'Please add a make'],
        trim: true,
    },
    model: {
        type: String,
        required: [true, 'Please add a model'],
        trim: true,
    },
    year: {
        type: Number,
        required: [true, 'Please add a year'],
    },
    license_plate: {
        type: String,
        required: [true, 'Please add a license plate'],
        unique: true,
        trim: true,
    },
    passenger_capacity: {
        type: Number,
        required: [true, 'Please add passenger capacity'],
    },
    fuel_type: {
        type: String,
        required: [true, 'Please add fuel type'],
        enum: ['Gasoline', 'Diesel', 'Electric', 'Hybrid'],
    },
    consumption_city: { // e.g., L/100km or MPG - specify unit in description/docs
        type: Number,
        // required: [true, 'Please add city fuel consumption'], // Made optional
    },
    consumption_highway: { // e.g., L/100km or MPG
        type: Number,
        // required: [true, 'Please add highway fuel consumption'], // Made optional
    },
    drivetrain: {
        type: String,
        enum: ['FWD', 'RWD', 'AWD', '4WD'],
    },
    category: {
        type: String,
        required: [true, 'Please add a category'],
        enum: ['Sedan', 'SUV', 'Truck', 'Van', 'Coupe', 'Convertible', 'Hatchback', 'Luxury', 'Economy'],
    },
    features: {
        type: [String], // Array of features like 'GPS', 'Bluetooth', 'Sunroof'
    },
    daily_rate: {
        type: Number,
        required: [true, 'Please add a daily rate'],
    },
    location: {
        type: mongoose.Schema.ObjectId,
        ref: 'Location', // References the Location model
        required: true,
    },
    availability_status: {
        type: String,
        enum: ['available', 'rented', 'maintenance'],
        default: 'available',
    },
    // Fields for AI Recommendation (Phase 2)
    suitable_road_types: {
        type: [String], // e.g., ['city', 'highway', 'light_offroad']
        default: ['city', 'highway']
    },
    tags: {
        type: [String], // e.g., ['family-friendly', 'business', 'fuel-efficient']
        index: true // Index tags for searching/filtering
    },
    imageUrls: {
        type: [String], // Array to store URLs or paths of uploaded images
        default: []
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// TODO: Add pre-save hooks or methods if needed (e.g., for VIN validation if re-added)

module.exports = mongoose.model('Car', CarSchema); 