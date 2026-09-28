const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

// Initialize Express App
const app = express();

// ============================================
// MIDDLEWARES
// ============================================

// Enable CORS (allows frontend to communicate with backend)
app.use(cors());

// Parse incoming JSON data
app.use(express.json());

// Parse URL-encoded data
app.use(express.urlencoded({ extended: true }));

// ============================================
// ROUTES
// ============================================

// Health check route
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: '🏥 Homeopathic Medicine Storage Management API is running!',
    });
});

// Auth routes
app.use('/api/auth', require('./routes/authRoutes'));
// Company routes
app.use('/api/companies', require('./routes/companyRoutes'));
// Category routes
app.use('/api/categories', require('./routes/categoryRoutes'));
// Size routes
app.use('/api/sizes', require('./routes/sizeRoutes'));
// Potency routes
app.use('/api/potencies', require('./routes/potencyRoutes'));
// Medicine routes
app.use('/api/medicines', require('./routes/medicineRoutes'));
// Product routes
app.use('/api/products', require('./routes/productRoutes'));
// Use Type routes
app.use('/api/use-types', require('./routes/useTypeRoutes'));
// Dashboard routes
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
// Sale routes
app.use('/api/sales', require('./routes/saleRoutes'));

// ============================================
// 404 HANDLER - Route not found
// ============================================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
    });
});

// ============================================
// GLOBAL ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
    console.error('Global Error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
    console.log(`📍 http://localhost:${PORT}`);
    console.log(`📍 http://localhost:${PORT}/api/auth/register  [POST]`);
    console.log(`📍 http://localhost:${PORT}/api/auth/login     [POST]`);
    console.log(`📍 http://localhost:${PORT}/api/auth/profile   [GET]\n`);
});