const express = require('express');
const {
    getCars,
    getCar,
    createCar,
    updateCar,
    deleteCar,
    uploadCarPhotos,
    deleteCarPhoto
} = require('../controllers/cars');

// --- Multer setup for file uploads ---
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Define storage location and filename
const uploadDir = path.join(__dirname, '../public/uploads/cars');
// Ensure upload directory exists
fs.mkdirSync(uploadDir, { recursive: true }); 

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Create a unique filename: fieldname-timestamp.extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter (only accept images)
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image')) {
        cb(null, true);
    } else {
        cb(new Error('Not an image! Please upload only images.'), false);
    }
};

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: fileFilter
});
// --- End Multer Setup ---

const router = express.Router();

// Import middleware
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.route('/')
    .get(getCars)
    .post(protect, authorize('admin'), createCar); // Only admin can create

router.route('/:id')
    .get(getCar)
    .put(protect, authorize('admin'), updateCar)    // Only admin can update
    .delete(protect, authorize('admin'), deleteCar); // Only admin can delete

// Route for handling image uploads
router.route('/:id/photos')
    .post(protect, authorize('admin'), upload.array('photos', 5), uploadCarPhotos); // Expect up to 5 files in field 'photos'

// Route for deleting a specific image (using filename)
router.route('/:id/photos/:imageName')
    .delete(protect, authorize('admin'), deleteCarPhoto);

module.exports = router; 