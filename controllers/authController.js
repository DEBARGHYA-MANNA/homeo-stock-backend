const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// ============================================
// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
// ============================================
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // 1. Check if user already exists
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists',
            });
        }

        // 2. Create new user
        const user = await User.create({
            name,
            email,
            password, // Password will be hashed automatically by the pre-save middleware
        });

        // 3. Generate token
        const token = generateToken(user._id);

        // 4. Send response
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: token,
            },
        });
    } catch (error) {
        console.error('Register Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error. Please try again later.',
            error: error.message,
        });
    }
};

// ============================================
// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
// ============================================
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Check if email and password are provided
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password',
            });
        }

        // 2. Find user by email and include password field
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
            });
        }

        // 3. Check if password matches
        const isPasswordMatch = await user.matchPassword(password);

        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
            });
        }

        // 4. Generate token
        const token = generateToken(user._id);

        // 5. Send response
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: token,
            },
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error. Please try again later.',
            error: error.message,
        });
    }
};

// ============================================
// @desc    Get current logged-in user profile
// @route   GET /api/auth/profile
// @access  Private (requires token)
// ============================================
const getUserProfile = async (req, res) => {
    try {
        // req.user is set by the auth middleware
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        res.status(200).json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        console.error('Profile Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error. Please try again later.',
            error: error.message,
        });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getUserProfile,
};