const Product = require('../models/Product');
const Medicine = require('../models/Medicine');

// ============================================
// HELPER: Build product display name for responses
// ============================================
const buildDisplayName = (product) => {
    const parts = [];

    // Medicine name or product name
    if (product.medicine && product.medicine.name) {
        parts.push(product.medicine.name);
    } else if (product.productName) {
        parts.push(product.productName);
    }

    // Company
    if (product.company && product.company.name) {
        parts.push(product.company.name);
    }

    // Category
    if (product.category && product.category.name) {
        parts.push(product.category.name);
    }

    // Size
    if (product.size && product.size.name) {
        parts.push(product.size.name);
    }

    // Potency (only if exists)
    if (product.potency && product.potency.name) {
        parts.push(product.potency.name);
    }

    return parts.join(' - ');
};

// ============================================
// @desc    Create a new product
// @route   POST /api/products
// @access  Private
// ============================================
const createProduct = async (req, res) => {
    try {
        const {
            productName,
            medicine,
            company,
            category,
            size,
            potency,
            useTypes,
            mrp,
            purchasePrice,
            discount,
            stock,
            lowStockThreshold,
            batchNumber,
            expiryDate,
            rackLocation,
            hsnCode,
        } = req.body;

        // Validation: Must have either medicine OR productName
        if (!medicine && !productName) {
            return res.status(400).json({
                success: false,
                message: 'Please provide either a medicine or a product name',
            });
        }

        // Check for duplicate product
        const duplicateFilter = {
            company,
            category,
            size,
            medicine: medicine || null,
            potency: potency || null,
        };

        if (!medicine && productName) {
            duplicateFilter.productName = { $regex: new RegExp(`^${productName.trim()}$`, 'i') };
        }

        const productExists = await Product.findOne(duplicateFilter);

        if (productExists) {
            return res.status(400).json({
                success: false,
                message: 'This product combination already exists',
            });
        }

        const product = await Product.create({
            productName: productName ? productName.trim() : '',
            medicine: medicine || null,
            company,
            category,
            size,
            potency: potency || null,
            useTypes: useTypes || [],
            mrp,
            purchasePrice,
            discount,
            stock,
            lowStockThreshold,
            batchNumber,
            expiryDate,
            rackLocation,
            hsnCode,
        });

        // Populate for response
        const populatedProduct = await Product.findById(product._id)
            .populate('medicine', 'name shortName')
            .populate('company', 'name')
            .populate('category', 'name')
            .populate('size', 'name volume unit')
            .populate('potency', 'name scale')
            .populate('useTypes', 'name');

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: populatedProduct,
        });
    } catch (error) {
        console.error('Create Product Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error while creating product',
            error: error.message,
        });
    }
};

// ============================================
// @desc    Get all products (with filters, search, pagination)
// @route   GET /api/products
// @access  Private
// ============================================
const getAllProducts = async (req, res) => {
    try {
        const {
            search,
            medicine,
            company,
            category,
            size,
            potency,
            useType,
            productType,
            lowStock,
            expired,
            isActive,
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc',
        } = req.query;

        const filter = {};

        // Search by medicine name OR product name
        if (search) {
            const matchingMedicines = await Medicine.find({
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { shortName: { $regex: search, $options: 'i' } },
                ],
            }).select('_id');

            const medicineIds = matchingMedicines.map((m) => m._id);

            filter.$or = [
                { medicine: { $in: medicineIds } },
                { productName: { $regex: search, $options: 'i' } },
            ];
        }

        // Filter by references
        if (medicine) filter.medicine = medicine;
        if (company) filter.company = company;
        if (category) filter.category = category;
        if (size) filter.size = size;
        if (potency) filter.potency = potency;

        // Filter by use type
        if (useType) filter.useTypes = useType;

        // Filter by product type
        if (productType === 'medicine') {
            filter.medicine = { $ne: null };
        } else if (productType === 'general') {
            filter.medicine = null;
        }

        // Filter low stock
        if (lowStock === 'true') {
            filter.$expr = { $lte: ['$stock', '$lowStockThreshold'] };
        }

        // Filter expired
        if (expired === 'true') {
            filter.expiryDate = { $lt: new Date() };
        }

        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }

        // Pagination
        const skip = (page - 1) * limit;

        // Sort
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const products = await Product.find(filter)
            .populate('medicine', 'name shortName')
            .populate('company', 'name')
            .populate('category', 'name')
            .populate('size', 'name volume unit')
            .populate('potency', 'name scale')
            .populate('useTypes', 'name')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Product.countDocuments(filter);

        res.status(200).json({
            success: true,
            count: products.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            data: products,
        });
    } catch (error) {
        console.error('Get Products Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error while fetching products',
            error: error.message,
        });
    }
};

// ============================================
// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Private
// ============================================
const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('medicine', 'name shortName commonUses')
            .populate('company', 'name phone email')
            .populate('category', 'name')
            .populate('size', 'name volume unit')
            .populate('potency', 'name scale level')
            .populate('useTypes', 'name description');

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found',
            });
        }

        res.status(200).json({
            success: true,
            data: product,
        });
    } catch (error) {
        console.error('Get Product Error:', error);

        if (error.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                message: 'Product not found (invalid ID)',
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
// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private
// ============================================
const updateProduct = async (req, res) => {
    try {
        const {
            productName,
            medicine,
            company,
            category,
            size,
            potency,
            useTypes,
            mrp,
            purchasePrice,
            discount,
            stock,
            lowStockThreshold,
            batchNumber,
            expiryDate,
            rackLocation,
            hsnCode,
            isActive,
        } = req.body;

        let product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found',
            });
        }

        // Validation: Must still have either medicine or productName after update
        const finalMedicine = medicine !== undefined ? medicine : product.medicine;
        const finalProductName = productName !== undefined ? productName : product.productName;

        if (!finalMedicine && !finalProductName) {
            return res.status(400).json({
                success: false,
                message: 'Product must have either a medicine or a product name',
            });
        }

        product = await Product.findByIdAndUpdate(
            req.params.id,
            {
                productName,
                medicine: medicine !== undefined ? medicine : product.medicine,
                company,
                category,
                size,
                potency: potency !== undefined ? potency : product.potency,
                useTypes,
                mrp,
                purchasePrice,
                discount,
                stock,
                lowStockThreshold,
                batchNumber,
                expiryDate,
                rackLocation,
                hsnCode,
                isActive,
            },
            { new: true, runValidators: true }
        )
            .populate('medicine', 'name shortName')
            .populate('company', 'name')
            .populate('category', 'name')
            .populate('size', 'name volume unit')
            .populate('potency', 'name scale')
            .populate('useTypes', 'name');

        res.status(200).json({
            success: true,
            message: 'Product updated successfully',
            data: product,
        });
    } catch (error) {
        console.error('Update Product Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error while updating product',
            error: error.message,
        });
    }
};

// ============================================
// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private
// ============================================
const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('medicine', 'name')
            .populate('company', 'name');

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found',
            });
        }

        const displayName = product.medicine
            ? product.medicine.name
            : product.productName;

        await Product.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: `Product '${displayName} - ${product.company.name}' deleted successfully`,
        });
    } catch (error) {
        console.error('Delete Product Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error while deleting product',
            error: error.message,
        });
    }
};

// ============================================
// @desc    Get low stock products
// @route   GET /api/products/reports/low-stock
// @access  Private
// ============================================
const getLowStockProducts = async (req, res) => {
    try {
        const products = await Product.find({
            $expr: { $lte: ['$stock', '$lowStockThreshold'] },
            isActive: true,
        })
            .populate('medicine', 'name shortName')
            .populate('company', 'name')
            .populate('category', 'name')
            .populate('size', 'name')
            .populate('potency', 'name')
            .populate('useTypes', 'name')
            .sort({ stock: 1 });

        res.status(200).json({
            success: true,
            count: products.length,
            message: products.length > 0
                ? `⚠️ ${products.length} products are running low on stock!`
                : '✅ All products have sufficient stock',
            data: products,
        });
    } catch (error) {
        console.error('Low Stock Report Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message,
        });
    }
};

// ============================================
// @desc    Get expired products
// @route   GET /api/products/reports/expired
// @access  Private
// ============================================
const getExpiredProducts = async (req, res) => {
    try {
        const products = await Product.find({
            expiryDate: { $lt: new Date() },
            isActive: true,
        })
            .populate('medicine', 'name shortName')
            .populate('company', 'name')
            .populate('category', 'name')
            .populate('size', 'name')
            .populate('potency', 'name')
            .populate('useTypes', 'name')
            .sort({ expiryDate: 1 });

        res.status(200).json({
            success: true,
            count: products.length,
            message: products.length > 0
                ? `🚨 ${products.length} products have expired!`
                : '✅ No expired products',
            data: products,
        });
    } catch (error) {
        console.error('Expired Report Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message,
        });
    }
};

module.exports = {
    createProduct,
    getAllProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    getLowStockProducts,
    getExpiredProducts,
};