const Medicine = require('../models/Medicine');

// ============================================
// @desc    Create a new medicine
// @route   POST /api/medicines
// @access  Private
// ============================================
const createMedicine = async (req, res) => {
    try {
        const { name, shortName, commonUses } = req.body;

        const medicineExists = await Medicine.findOne({
            name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        });

        if (medicineExists) {
            return res.status(400).json({
                success: false,
                message: `Medicine '${name}' already exists`,
            });
        }

        const medicine = await Medicine.create({
            name: name.trim(),
            shortName: shortName ? shortName.trim() : '',
            commonUses,
        });

        res.status(201).json({
            success: true,
            message: 'Medicine created successfully',
            data: medicine,
        });
    } catch (error) {
        console.error('Create Medicine Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error while creating medicine',
            error: error.message,
        });
    }
};

// ============================================
// @desc    Get all medicines
// @route   GET /api/medicines
// @access  Private
// ============================================
const getAllMedicines = async (req, res) => {
    try {
        const { search, isActive, page = 1, limit = 50 } = req.query;

        const filter = {};

        if (search) {
            // Search in both name and shortName
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { shortName: { $regex: search, $options: 'i' } },
            ];
        }

        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }

        const skip = (page - 1) * limit;

        const medicines = await Medicine.find(filter)
            .sort({ name: 1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Medicine.countDocuments(filter);

        res.status(200).json({
            success: true,
            count: medicines.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            data: medicines,
        });
    } catch (error) {
        console.error('Get Medicines Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error while fetching medicines',
            error: error.message,
        });
    }
};

// ============================================
// @desc    Get single medicine by ID
// @route   GET /api/medicines/:id
// @access  Private
// ============================================
const getMedicineById = async (req, res) => {
    try {
        const medicine = await Medicine.findById(req.params.id);

        if (!medicine) {
            return res.status(404).json({
                success: false,
                message: 'Medicine not found',
            });
        }

        res.status(200).json({
            success: true,
            data: medicine,
        });
    } catch (error) {
        console.error('Get Medicine Error:', error);

        if (error.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                message: 'Medicine not found (invalid ID)',
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
// @desc    Update a medicine
// @route   PUT /api/medicines/:id
// @access  Private
// ============================================
const updateMedicine = async (req, res) => {
    try {
        const { name, shortName, commonUses, isActive } = req.body;

        let medicine = await Medicine.findById(req.params.id);

        if (!medicine) {
            return res.status(404).json({
                success: false,
                message: 'Medicine not found',
            });
        }

        if (name && name.trim().toLowerCase() !== medicine.name.toLowerCase()) {
            const nameExists = await Medicine.findOne({
                name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
            });
            if (nameExists) {
                return res.status(400).json({
                    success: false,
                    message: `Medicine '${name}' already exists`,
                });
            }
        }

        medicine = await Medicine.findByIdAndUpdate(
            req.params.id,
            { name, shortName, commonUses, isActive },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Medicine updated successfully',
            data: medicine,
        });
    } catch (error) {
        console.error('Update Medicine Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error while updating medicine',
            error: error.message,
        });
    }
};

// ============================================
// @desc    Delete a medicine
// @route   DELETE /api/medicines/:id
// @access  Private
// ============================================
const deleteMedicine = async (req, res) => {
    try {
        const medicine = await Medicine.findById(req.params.id);

        if (!medicine) {
            return res.status(404).json({
                success: false,
                message: 'Medicine not found',
            });
        }

        await Medicine.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: `Medicine '${medicine.name}' deleted successfully`,
        });
    } catch (error) {
        console.error('Delete Medicine Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error while deleting medicine',
            error: error.message,
        });
    }
};

module.exports = {
    createMedicine,
    getAllMedicines,
    getMedicineById,
    updateMedicine,
    deleteMedicine,
};