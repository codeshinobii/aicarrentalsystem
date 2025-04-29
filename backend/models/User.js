const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name'],
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false // Don't return password by default
    },
    role: {
        type: String,
        enum: ['customer', 'admin'],
        default: 'customer'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    // --- ADDED AI Preferences --- 
    aiPreferences: {
        defaultPassengers: {
            type: Number,
            min: 1,
            max: 10,
            default: null
        },
        preferredCarType: {
            type: String,
            enum: ['sedan', 'suv', 'luxury', 'sports', 'compact', null],
            default: null
        },
        typicalUseCase: {
            type: String,
            enum: ['business', 'family', 'leisure', 'commute', null],
            default: null
        },
        fuelPreference: {
            type: String,
            enum: ['petrol', 'diesel', 'hybrid', 'electric', null],
            default: null
        }
    }
    // We can add fields like resetPasswordToken, resetPasswordExpire later if needed
});

// Encrypt password using bcrypt before saving
UserSchema.pre('save', async function(next) {
    // Only run this function if password was actually modified
    if (!this.isModified('password')) {
        next();
    }
    // Hash the password with cost of 10
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function() {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema); 