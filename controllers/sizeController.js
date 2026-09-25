const Size = require('../models/Size');

// ============================================
// @desc    Create a new size
// @route   POST /api/sizes
// @access  Private
// ============================================
const createSize = async (req, res) => {
    try {
        const { name, volume, unit } = req.body;

        // Check if size already exists
        const sizeExists = await Size.findOne({
            name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        });

        if (sizeExists) {
            return res.status(400).json({
                success: false,
                message: `Size '${name}' already exists`,
            });
        }

        const size = await Size.create({
            name: name.trim(),
            volume,
            unit,
        });

        res.status(201).json({
            success: true,
            message: 'Size created successfully',
            data: size,
        });
    } catch (error) {
        console.error('Create Size Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error while creating size',
            error: error.message,
        });
    }
};

// ============================================
// @desc    Get all sizes
// @route   GET /api/sizes
// @access  Private
// ============================================
const getAllSizes = async (req, res) => {
    try {
        const { search, unit, isActive, page = 1, limit = 20 } = req.query;

        const filter = {};

        if (search) {
            filter.name = { $regex: search, $options: 'i' };
        }

        if (unit) {
            filter.unit = unit;
        }

        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }

        const skip = (page - 1) * limit;

        const sizes = await Size.find(filter)
            .sort({ volume: 1 }) // Sort by actual size (smallest first)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Size.countDocuments(filter);

        res.status(200).json({
            success: true,
            count: sizes.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            data: sizes,
        });
    } catch (error) {
        console.error('Get Sizes Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error while fetching sizes',
            error: error.message,
        });
    }
};

// ============================================
// @desc    Get single size by ID
// @route   GET /api/sizes/:id
// @access  Private
// ============================================
const getSizeById = async (req, res) => {
    try {
        const size = await Size.findById(req.params.id);

        if (!size) {
            return res.status(404).json({
                success: false,
                message: 'Size not found',
            });
        }

        res.status(200).json({
            success: true,
            data: size,
        });
    } catch (error) {
        console.error('Get Size Error:', error);

        if (error.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                message: 'Size not found (invalid ID)',
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message,
        });
    }
};

// ============================================
// @desc    Update a size
// @route   PUT /api/sizes/:id
// @access  Private
// ============================================
const updateSize = async (req, res) => {
    try {
        const { name, volume, unit, isActive } = req.body;

        let size = await Size.findById(req.params.id);

        if (!size) {
            return res.status(404).json({
                success: false,
                message: 'Size not found',
            });
        }

        // If name is changing, check uniqueness
        if (name && name.trim().toLowerCase() !== size.name.toLowerCase()) {
            const nameExists = await Size.findOne({
                name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
            });
            if (nameExists) {
                return res.status(400).json({
                    success: false,
                    message: `Size '${name}' already exists`,
                });
            }
        }

        size = await Size.findByIdAndUpdate(
            req.params.id,
            { name, volume, unit, isActive },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Size updated successfully',
            data: size,
        });
    } catch (error) {
        console.error('Update Size Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error while updating size',
            error: error.message,
        });
    }
};

// ============================================
// @desc    Delete a size
// @route   DELETE /api/sizes/:id
// @access  Private
// ============================================
const deleteSize = async (req, res) => {
    try {
        const size = await Size.findById(req.params.id);

        if (!size) {
            return res.status(404).json({
                success: false,
                message: 'Size not found',
            });
        }

        await Size.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: `Size '${size.name}' deleted successfully`,
        });
    } catch (error) {
        console.error('Delete Size Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error while deleting size',
            error: error.message,
        });
    }
};

module.exports = {
    createSize,
    getAllSizes,
    getSizeById,
    updateSize,
    deleteSize,
};