const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const colors = require('colors');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path'); // Require path
const connectDB = require('./config/db');
const errorHandler = require('./middleware/error');

// Load env vars
dotenv.config({ path: './config/config.env' });

// Connect to database
connectDB();

// Route files
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const carsRoutes = require('./routes/cars');
const locationsRoutes = require('./routes/locations');
const bookingsRoutes = require('./routes/bookings');
const adminRoutes = require('./routes/admin'); // Import admin routes

const app = express();

// Body parser - Increase limit for potential large uploads/data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true })); // Add urlencoded with limit and extended: true

// Cookie parser
app.use(cookieParser());

// Enable CORS
// TODO: Configure CORS more strictly for production
app.use(cors({
    origin: '*', // Allow all origins for now (adjust for production!)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // Allow cookies if using them for auth later
    allowedHeaders: 'Content-Type, Authorization, X-Requested-With'
}));

// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Set static folder for uploads
app.use(express.static(path.join(__dirname, 'public')));

// Mount routers
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/cars', carsRoutes);
app.use('/api/v1/locations', locationsRoutes);
app.use('/api/v1/bookings', bookingsRoutes);
app.use('/api/v1/admin', adminRoutes); // Mount admin routes

// Error handler middleware (must be after mounting routers)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(
    PORT,
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold)
);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`.red);
    // Close server & exit process
    server.close(() => process.exit(1));
}); 