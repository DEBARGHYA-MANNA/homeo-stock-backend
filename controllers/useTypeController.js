const UseType = require('../models/UseType');

// ============================================
// @desc    Create a new use type
// @route   POST /api/use-types
// @access  Private
// ============================================
const createUseType = async (req, res) => {
    try {
        const { name, description } = req.body;

        const useTypeExists = await UseType.findOne({
            name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        });

        if (useTypeExists) {
            return res.status(400).json({
                success: false,
                message: `Use type '${name}' already exists`,
            });
        }

        const useType = await UseType.create({
            name: name.trim(),
            description,
        });

        res.status(201).json({
            success: true,
            message: 'Use type created successfully',
            data: useType,
        });
    } catch (error) {
        console.error('Create UseType Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error while creating use type',
            error: error.message,
        });
    }
};

// ============================================
// @desc    Get all use types
// @route   GET /api/use-types
// @access  Private
// ============================================
const getAllUseTypes = async (req, res) => {
    try {
        const { search, isActive, page = 1, limit = 50 } = req.query;

        const filter = {};

        if (search) {
            filter.name = { $regex: search, $options: 'i' };
        }

        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }

        const skip = (page - 1) * limit;

        const useTypes = await UseType.find(filter)
            .sort({ name: 1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await UseType.countDocuments(filter);

        res.status(200).json({
            success: true,
            count: useTypes.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            data: useTypes,
        });
    } catch (error) {
        console.error('Get UseTypes Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error while fetching use types',
            error: error.message,
        });
    }
};

// ============================================
// @desc    Get single use type by ID
// @route   GET /api/use-types/:id
// @access  Private
// ============================================
const getUseTypeById = async (req, res) => {
    try {
        const useType = await UseType.findById(req.params.id);

        if (!useType) {
            return res.status(404).json({
                success: false,
                message: 'Use type not found',
            });
        }

        res.status(200).json({
            success: true,
            data: useType,
        });
    } catch (error) {
        console.error('Get UseType Error:', error);

        if (error.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                message: 'Use type not found (invalid ID)',
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
// @desc    Update a use type
// @route   PUT /api/use-types/:id
// @access  Private
// ============================================
const updateUseType = async (req, res) => {
    try {
        const { name, description, isActive } = req.body;

        let useType = await UseType.findById(req.params.id);

        if (!useType) {
            return res.status(404).json({
                success: false,
                message: 'Use type not found',
            });
        }

        if (name && name.trim().toLowerCase() !== useType.name.toLowerCase()) {
            const nameExists = await UseType.findOne({
                name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
            });
            if (nameExists) {
                return res.status(400).json({
                    success: false,
                    message: `Use type '${name}' already exists`,
                });
            }
        }

        useType = await UseType.findByIdAndUpdate(
            req.params.id,
            { name, description, isActive },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Use type updated successfully',
            data: useType,
        });
    } catch (error) {
        console.error('Update UseType Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error while updating use type',
            error: error.message,
        });
    }
};

// ============================================
// @desc    Delete a use type
// @route   DELETE /api/use-types/:id
// @access  Private
// ============================================
const deleteUseType = async (req, res) => {
    try {
        const useType = await UseType.findById(req.params.id);

        if (!useType) {
            return res.status(404).json({
                success: false,
                message: 'Use type not found',
            });
        }

        await UseType.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: `Use type '${useType.name}' deleted successfully`,
        });
    } catch (error) {
        console.error('Delete UseType Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error while deleting use type',
            error: error.message,
        });
    }
};

module.exports = {
    createUseType,
    getAllUseTypes,
    getUseTypeById,
    updateUseType,
    deleteUseType,
};