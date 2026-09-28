const Potency = require('../models/Potency');

// ============================================
// @desc    Create a new potency
// @route   POST /api/potencies
// @access  Private
// ============================================
const createPotency = async (req, res) => {
    try {
        const { name, scale, level, description } = req.body;

        // Check if potency already exists (case-insensitive)
        const potencyExists = await Potency.findOne({
            name: name.trim().toUpperCase(),
        });

        if (potencyExists) {
            return res.status(400).json({
                success: false,
                message: `Potency '${name}' already exists`,
            });
        }

        const potency = await Potency.create({
            name: name.trim().toUpperCase(),
            scale,
            level,
            description,
        });

        res.status(201).json({
            success: true,
            message: 'Potency created successfully',
            data: potency,
        });
    } catch (error) {
        console.error('Create Potency Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error while creating potency',
            error: error.message,
        });
    }
};

// ============================================
// @desc    Get all potencies
// @route   GET /api/potencies
// @access  Private
// ============================================
const getAllPotencies = async (req, res) => {
    try {
        const { search, scale, isActive, page = 1, limit = 50 } = req.query;

        const filter = {};

        if (search) {
            filter.name = { $regex: search, $options: 'i' };
        }

        if (scale) {
            filter.scale = scale.toUpperCase();
        }

        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }

        const skip = (page - 1) * limit;

        const potencies = await Potency.find(filter)
            .sort({ level: 1 }) // Sort by potency level (lowest first)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Potency.countDocuments(filter);

        res.status(200).json({
            success: true,
            count: potencies.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            data: potencies,
        });
    } catch (error) {
        console.error('Get Potencies Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error while fetching potencies',
            error: error.message,
        });
    }
};

// ============================================
// @desc    Get single potency by ID
// @route   GET /api/potencies/:id
// @access  Private
// ============================================
const getPotencyById = async (req, res) => {
    try {
        const potency = await Potency.findById(req.params.id);

        if (!potency) {
            return res.status(404).json({
                success: false,
                message: 'Potency not found',
            });
        }

        res.status(200).json({
            success: true,
            data: potency,
        });
    } catch (error) {
        console.error('Get Potency Error:', error);

        if (error.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                message: 'Potency not found (invalid ID)',
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
// @desc    Update a potency
// @route   PUT /api/potencies/:id
// @access  Private
// ============================================
const updatePotency = async (req, res) => {
    try {
        const { name, scale, level, description, isActive } = req.body;

        let potency = await Potency.findById(req.params.id);

        if (!potency) {
            return res.status(404).json({
                success: false,
                message: 'Potency not found',
            });
        }

        // If name is changing, check uniqueness
        if (name && name.trim().toUpperCase() !== potency.name) {
            const nameExists = await Potency.findOne({
                name: name.trim().toUpperCase(),
            });
            if (nameExists) {
                return res.status(400).json({
                    success: false,
                    message: `Potency '${name}' already exists`,
                });
            }
        }

        potency = await Potency.findByIdAndUpdate(
            req.params.id,
            {
                name: name ? name.trim().toUpperCase() : potency.name,
                scale,
                level,
                description,
                isActive,
            },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Potency updated successfully',
            data: potency,
        });
    } catch (error) {
        console.error('Update Potency Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error while updating potency',
            error: error.message,
        });
    }
};

// ============================================
// @desc    Delete a potency
// @route   DELETE /api/potencies/:id
// @access  Private
// ============================================
const deletePotency = async (req, res) => {
    try {
        const potency = await Potency.findById(req.params.id);

        if (!potency) {
            return res.status(404).json({
                success: false,
                message: 'Potency not found',
            });
        }

        await Potency.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: `Potency '${potency.name}' deleted successfully`,
        });
    } catch (error) {
        console.error('Delete Potency Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error while deleting potency',
            error: error.message,
        });
    }
};

module.exports = {
    createPotency,
    getAllPotencies,
    getPotencyById,
    updatePotency,
    deletePotency,
};