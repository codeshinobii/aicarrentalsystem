const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db'); // Adjust path if your db connection is elsewhere
const Car = require('./models/Car');       // Adjust path to your Car model
const Location = require('./models/Location'); // Adjust path to your Location model

// Load env vars
dotenv.config({ path: './config/config.env' }); // Adjust path to your config file

// Car data (Paste the array from above here)
const carsToSeed = [
  { make: "Toyota", model: "Camry", year: 2021, license_plate: "SEED-001", color: "Silver", passenger_capacity: 5, daily_rate: 55, category: "Sedan", fuel_type: "Gasoline", fuel_consumption_city: 9.0, fuel_consumption_highway: 6.5, drivetrain: "FWD", features: ["Bluetooth", "Backup Camera", "Cruise Control"], tags: ["reliable", "family", "commute"], availability_status: "available", location: "YOUR_LOCATION_ID_HERE" },
  { make: "Honda", model: "CR-V", year: 2022, license_plate: "SEED-002", color: "Blue", passenger_capacity: 5, daily_rate: 65, category: "SUV", fuel_type: "Gasoline", fuel_consumption_city: 8.5, fuel_consumption_highway: 7.0, drivetrain: "AWD", features: ["Apple CarPlay", "Android Auto", "Sunroof", "Heated Seats"], tags: ["spacious", "suv", "popular"], availability_status: "available", location: "YOUR_LOCATION_ID_HERE" },
  { make: "Ford", model: "Mustang", year: 2020, license_plate: "SEED-003", color: "Red", passenger_capacity: 4, daily_rate: 90, category: "Coupe", fuel_type: "Gasoline", fuel_consumption_city: 15.0, fuel_consumption_highway: 9.0, drivetrain: "RWD", features: ["Leather Seats", "Premium Sound System", "Convertible"], tags: ["muscle", "sports car", "fun"], availability_status: "available", location: "YOUR_LOCATION_ID_HERE" },
  { make: "Tesla", model: "Model 3", year: 2022, license_plate: "SEED-004", color: "White", passenger_capacity: 5, daily_rate: 110, category: "Luxury", fuel_type: "Electric", drivetrain: "AWD", features: ["Autopilot", "Large Touchscreen", "Minimalist Interior", "Glass Roof"], tags: ["electric", "tech", "premium", "ev"], availability_status: "available", location: "YOUR_LOCATION_ID_HERE" },
  { make: "Volkswagen", model: "Golf", year: 2019, license_plate: "SEED-005", color: "Black", passenger_capacity: 5, daily_rate: 45, category: "Hatchback", fuel_type: "Gasoline", fuel_consumption_city: 8.0, fuel_consumption_highway: 6.0, drivetrain: "FWD", features: ["Hatchback", "Bluetooth", "Manual Transmission Available"], tags: ["compact", "efficient", "city car"], availability_status: "maintenance", location: "YOUR_LOCATION_ID_HERE" },
  { make: "BMW", model: "X5", year: 2021, license_plate: "SEED-006", color: "Gray", passenger_capacity: 5, daily_rate: 120, category: "Luxury", fuel_type: "Gasoline", fuel_consumption_city: 12.0, fuel_consumption_highway: 9.0, drivetrain: "AWD", features: ["Panoramic Sunroof", "Leather Upholstery", "Navigation", "Parking Assist"], tags: ["luxury suv", "performance", "family"], availability_status: "available", location: "YOUR_LOCATION_ID_HERE" },
  { make: "Hyundai", model: "Ioniq 5", year: 2023, license_plate: "SEED-007", color: "Matte Gray", passenger_capacity: 5, daily_rate: 85, category: "SUV", fuel_type: "Electric", drivetrain: "RWD", features: ["Fast Charging", "V2L (Vehicle-to-Load)", "Digital Cockpit", "Sustainable Materials"], tags: ["ev", "modern", "crossover", "stylish"], availability_status: "available", location: "YOUR_LOCATION_ID_HERE" },
  { make: "Jeep", model: "Wrangler", year: 2020, license_plate: "SEED-008", color: "Green", passenger_capacity: 4, daily_rate: 75, category: "SUV", fuel_type: "Gasoline", fuel_consumption_city: 14.0, fuel_consumption_highway: 10.0, drivetrain: "4WD", features: ["Removable Top/Doors", "Off-road Capability", "Uconnect System"], tags: ["offroad", "adventure", "iconic", "4x4"], availability_status: "available", location: "YOUR_LOCATION_ID_HERE" },
  { make: "Mercedes-Benz", model: "C-Class", year: 2022, license_plate: "SEED-009", color: "White", passenger_capacity: 5, daily_rate: 100, category: "Luxury", fuel_type: "Gasoline", fuel_consumption_city: 10.0, fuel_consumption_highway: 7.5, drivetrain: "RWD", features: ["MBUX Infotainment", "Ambient Lighting", "Driver Assistance Package"], tags: ["luxury sedan", "comfort", "prestige"], availability_status: "rented", location: "YOUR_LOCATION_ID_HERE" },
  { make: "Kia", model: "Telluride", year: 2023, license_plate: "SEED-010", color: "Dark Moss", passenger_capacity: 7, daily_rate: 80, category: "SUV", fuel_type: "Gasoline", fuel_consumption_city: 12.5, fuel_consumption_highway: 9.5, drivetrain: "AWD", features: ["3-Row Seating", "Highway Driving Assist", "Ventilated Seats", "Large Cargo Space"], tags: ["family suv", "spacious", "value"], availability_status: "available", location: "YOUR_LOCATION_ID_HERE" },
  { make: "Subaru", model: "Outback", year: 2021, license_plate: "SEED-011", color: "Bronze", passenger_capacity: 5, daily_rate: 60, category: "SUV", fuel_type: "Gasoline", fuel_consumption_city: 9.5, fuel_consumption_highway: 7.0, drivetrain: "AWD", features: ["Symmetrical AWD", "EyeSight Driver Assist", "Roof Rails", "Generous Ground Clearance"], tags: ["awd", "wagon", "versatile", "outdoors"], availability_status: "available", location: "YOUR_LOCATION_ID_HERE" },
  { make: "Chevrolet", model: "Bolt EV", year: 2022, license_plate: "SEED-012", color: "Silver", passenger_capacity: 5, daily_rate: 50, category: "Hatchback", fuel_type: "Electric", drivetrain: "FWD", features: ["One-Pedal Driving", "Regen on Demand", "Good EV Range for Price"], tags: ["ev", "affordable", "hatchback", "city ev"], availability_status: "available", location: "YOUR_LOCATION_ID_HERE" },
  { make: "Porsche", model: "911 Carrera", year: 2021, license_plate: "SEED-013", color: "Guards Red", passenger_capacity: 2, daily_rate: 250, category: "Coupe", fuel_type: "Gasoline", fuel_consumption_city: 16.0, fuel_consumption_highway: 10.0, drivetrain: "RWD", features: [" PDK Transmission", "Sport Chrono Package", "Iconic Design", "Performance Handling"], tags: ["sports car", "performance", "luxury", "iconic"], availability_status: "available", location: "YOUR_LOCATION_ID_HERE" },
  { make: "Toyota", model: "Prius", year: 2020, license_plate: "SEED-014", color: "Blue", passenger_capacity: 5, daily_rate: 50, category: "Hatchback", fuel_type: "Hybrid", fuel_consumption_city: 4.5, fuel_consumption_highway: 4.0, drivetrain: "FWD", features: ["Excellent Fuel Economy", "Hybrid Synergy Drive", "Toyota Safety Sense"], tags: ["hybrid", "fuel efficient", "eco-friendly", "reliable"], availability_status: "available", location: "YOUR_LOCATION_ID_HERE" },
  { make: "Chrysler", model: "Pacifica", year: 2022, license_plate: "SEED-015", color: "Black", passenger_capacity: 7, daily_rate: 70, category: "Van", fuel_type: "Gasoline", fuel_consumption_city: 13.0, fuel_consumption_highway: 9.0, drivetrain: "FWD", features: ["Stow 'n Go Seating", "Family Entertainment System", "Sliding Doors", "Ample Storage"], tags: ["minivan", "family", "spacious", "road trip"], availability_status: "available", location: "YOUR_LOCATION_ID_HERE" }
];


// Function to seed data
const seedData = async () => {
    try {
        await connectDB();
        console.log('Database Connected...');

        // Optional: Delete existing cars first (uncomment if needed)
        // console.log('Deleting existing cars...');
        // await Car.deleteMany();
        // console.log('Existing cars deleted.');

        // --- Get a default location ID ---
        let defaultLocationId = null;
        const firstLocation = await Location.findOne();
        if (firstLocation) {
            defaultLocationId = firstLocation._id;
            console.log(`Found default location ID: ${defaultLocationId}`);
        } else {
            console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
            console.error('ERROR: No locations found in the database.');
            console.error('Please add at least one location before running this script,');
            console.error('OR manually edit the script to replace "YOUR_LOCATION_ID_HERE"');
            console.error('with valid MongoDB ObjectId strings for your locations.');
            console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
            await mongoose.connection.close();
            process.exit(1); // Exit with error
        }
        // --- Assign default location ID to cars ---
        const carsWithLocation = carsToSeed.map(car => ({
            ...car,
            // Use the fetched ID if the placeholder is present
            location: car.location === "YOUR_LOCATION_ID_HERE" ? defaultLocationId : car.location
        }));

        // --- Insert Cars ---
        console.log('Inserting seed cars...');
        await Car.insertMany(carsWithLocation);
        console.log('Cars seeded successfully!');

        await mongoose.connection.close();
        console.log('Database connection closed.');
        process.exit();

    } catch (err) {
        console.error('Error seeding data:', err);
        // Ensure connection is closed even on error
        if (mongoose.connection.readyState === 1) {
             await mongoose.connection.close();
             console.log('Database connection closed due to error.');
        }
        process.exit(1);
    }
};

// Run the seeder function
seedData(); 