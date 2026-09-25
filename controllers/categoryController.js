const Category = require('../models/Category');

// ============================================
// @desc    Create a new category
// @route   POST /api/categories
// @access  Private
// ============================================
const createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;

        // Check if category already exists (case-insensitive)
        const categoryExists = await Category.findOne({
            name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        });

        if (categoryExists) {
            return res.status(400).json({
                success: false,
                message: `Category '${name}' already exists`,
            });
        }

        const category = await Category.create({
            name: name.trim(),
            description,
        });

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: category,
        });
    } catch (error) {
        console.error('Create Category Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error while creating category',
            error: error.message,
        });
    }
};

// ============================================
// @desc    Get all categories
// @route   GET /api/categories
// @access  Private
// ============================================
const getAllCategories = async (req, res) => {
    try {
        const { search, isActive, page = 1, limit = 20 } = req.query;

        const filter = {};

        if (search) {
            filter.name = { $regex: search, $options: 'i' };
        }

        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }

        const skip = (page - 1) * limit;

        const categories = await Category.find(filter)
            .sort({ name: 1 }) // Alphabetical order
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Category.countDocuments(filter);

        res.status(200).json({
            success: true,
            count: categories.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            data: categories,
        });
    } catch (error) {
        console.error('Get Categories Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error while fetching categories',
            error: error.message,
        });
    }
};

// ============================================
// @desc    Get single category by ID
// @route   GET /api/categories/:id
// @access  Private
// ============================================
const getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found',
            });
        }

        res.status(200).json({
            success: true,
            data: category,
        });
    } catch (error) {
        console.error('Get Category Error:', error);

        if (error.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                message: 'Category not found (invalid ID)',
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
// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private
// ============================================
const updateCategory = async (req, res) => {
    try {
        const { name, description, isActive } = req.body;

        let category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found',
            });
        }

        // If name is changing, check uniqueness
        if (name && name.trim().toLowerCase() !== category.name.toLowerCase()) {
            const nameExists = await Category.findOne({
                name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
            });
            if (nameExists) {
                return res.status(400).json({
                    success: false,
                    message: `Category '${name}' already exists`,
                });
            }
        }

        category = await Category.findByIdAndUpdate(
            req.params.id,
            { name, description, isActive },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Category updated successfully',
            data: category,
        });
    } catch (error) {
        console.error('Update Category Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error while updating category',
            error: error.message,
        });
    }
};

// ============================================
// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private
// ============================================
const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found',
            });
        }

        await Category.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: `Category '${category.name}' deleted successfully`,
        });
    } catch (error) {
        console.error('Delete Category Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error while deleting category',
            error: error.message,
        });
    }
};

module.exports = {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
};