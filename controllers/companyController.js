const Company = require('../models/Company');

// ============================================
// @desc    Create a new company
// @route   POST /api/companies
// @access  Private
// ============================================
const createCompany = async (req, res) => {
    try {
        const { name, description, contactPerson, phone, email, address, country } = req.body;

        // Check if company already exists
        const companyExists = await Company.findOne({ name: name.trim() });

        if (companyExists) {
            return res.status(400).json({
                success: false,
                message: `Company '${name}' already exists`,
            });
        }

        // Create company
        const company = await Company.create({
            name,
            description,
            contactPerson,
            phone,
            email,
            address,
            country,
        });

        res.status(201).json({
            success: true,
            message: 'Company created successfully',
            data: company,
        });
    } catch (error) {
        console.error('Create Company Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error while creating company',
            error: error.message,
        });
    }
};

// ============================================
// @desc    Get all companies (with search & filter)
// @route   GET /api/companies
// @access  Private
// ============================================
const getAllCompanies = async (req, res) => {
    try {
        const { search, isActive, page = 1, limit = 10 } = req.query;

        // Build filter object
        const filter = {};

        // Search by name (case-insensitive)
        if (search) {
            filter.name = { $regex: search, $options: 'i' };
        }

        // Filter by active/inactive
        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }

        // Pagination
        const skip = (page - 1) * limit;

        // Get companies
        const companies = await Company.find(filter)
            .sort({ createdAt: -1 }) // Newest first
            .skip(skip)
            .limit(parseInt(limit));

        // Get total count for pagination
        const total = await Company.countDocuments(filter);

        res.status(200).json({
            success: true,
            count: companies.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            data: companies,
        });
    } catch (error) {
        console.error('Get Companies Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error while fetching companies',
            error: error.message,
        });
    }
};

// ============================================
// @desc    Get single company by ID
// @route   GET /api/companies/:id
// @access  Private
// ============================================
const getCompanyById = async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found',
            });
        }

        res.status(200).json({
            success: true,
            data: company,
        });
    } catch (error) {
        console.error('Get Company Error:', error);

        // Handle invalid MongoDB ID format
        if (error.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                message: 'Company not found (invalid ID)',
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server Error while fetching company',
            error: error.message,
        });
    }
};

// ============================================
// @desc    Update a company
// @route   PUT /api/companies/:id
// @access  Private
// ============================================
const updateCompany = async (req, res) => {
    try {
        const { name, description, contactPerson, phone, email, address, country, isActive } = req.body;

        // Check if company exists
        let company = await Company.findById(req.params.id);

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found',
            });
        }

        // If name is being changed, check if new name already exists
        if (name && name.trim() !== company.name) {
            const nameExists = await Company.findOne({ name: name.trim() });
            if (nameExists) {
                return res.status(400).json({
                    success: false,
                    message: `Company '${name}' already exists`,
                });
            }
        }

        // Update company
        company = await Company.findByIdAndUpdate(
            req.params.id,
            { name, description, contactPerson, phone, email, address, country, isActive },
            {
                new: true,       // Return the updated document
                runValidators: true, // Run schema validations
            }
        );

        res.status(200).json({
            success: true,
            message: 'Company updated successfully',
            data: company,
        });
    } catch (error) {
        console.error('Update Company Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error while updating company',
            error: error.message,
        });
    }
};

// ============================================
// @desc    Delete a company
// @route   DELETE /api/companies/:id
// @access  Private (Admin only - we'll add this later)
// ============================================
const deleteCompany = async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found',
            });
        }

        await Company.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: `Company '${company.name}' deleted successfully`,
        });
    } catch (error) {
        console.error('Delete Company Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error while deleting company',
            error: error.message,
        });
    }
};

module.exports = {
    createCompany,
    getAllCompanies,
    getCompanyById,
    updateCompany,
    deleteCompany,
};