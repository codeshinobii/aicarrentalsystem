const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
    address: {
        type: String,
        required: [true, 'Please add an address'],
        trim: true,
    },
    city: {
        type: String,
        required: [true, 'Please add a city'],
        trim: true,
    },
    country: {
        type: String,
        required: [true, 'Please add a country'],
        trim: true,
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Location', LocationSchema); 