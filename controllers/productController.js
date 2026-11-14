const Product = require('../models/Product');
const Medicine = require('../models/Medicine');

// ============================================
// HELPER: Cartesian product of N arrays
// ============================================
const cartesian = (...arrays) =>
    arrays.reduce(
        (acc, arr) => acc.flatMap((combo) => arr.map((val) => [...combo, val])),
        [[]]
    );

// ============================================
// @desc    Create products — full Cartesian variant generation
// @route   POST /api/products
// @access  Private
// ============================================
const createProduct = async (req, res) => {
    try {
        const {
            productName,
            medicine,
            companies,      // ★ Array of company IDs
            categories,     // ★ Array of category IDs
            sizes,          // Array of size IDs
            potencies,      // Array of potency IDs
            useTypes,       // ★ Array of useType IDs
            lowStockThreshold,
            hsnCode,
        } = req.body;

        // ── Validation ──
        if (!medicine && !productName) {
            return res.status(400).json({
                success: false,
                message: 'Please provide either a medicine or a product name',
            });
        }

        if (!companies || !Array.isArray(companies) || companies.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one company is required',
            });
        }

        if (!sizes || !Array.isArray(sizes) || sizes.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one size is required',
            });
        }

        const isMedicine = !!medicine;

        // Build dimension arrays — optional dims default to [null]
        const companyList = companies;
        const categoryList = categories && categories.length > 0 ? categories : [null];
        const sizeList = sizes;
        const potencyList = isMedicine && potencies && potencies.length > 0 ? potencies : [null];
        const useTypeList = useTypes && useTypes.length > 0 ? useTypes : [null];

        // ★ Cartesian product: C × Cat × S × P × U
        const combinations = cartesian(
            companyList,
            categoryList,
            sizeList,
            potencyList,
            useTypeList
        );

        const createdProducts = [];
        const skippedProducts = [];
        const errors = [];

        for (const [companyId, categoryId, sizeId, potencyId, useTypeId] of combinations) {
            try {
                // Duplicate check across ALL variant dimensions
                const duplicateFilter = {
                    company: companyId,
                    category: categoryId || null,
                    size: sizeId,
                    medicine: medicine || null,
                    potency: potencyId || null,
                    useType: useTypeId || null,
                };

                if (!medicine && productName) {
                    duplicateFilter.productName = {
                        $regex: new RegExp(`^${productName.trim()}$`, 'i'),
                    };
                }

                const exists = await Product.findOne(duplicateFilter);

                if (exists) {
                    skippedProducts.push({
                        company: companyId,
                        category: categoryId,
                        size: sizeId,
                        potency: potencyId,
                        useType: useTypeId,
                        reason: 'Duplicate',
                    });
                    continue;
                }

                const product = await Product.create({
                    productName: productName ? productName.trim() : '',
                    medicine: medicine || null,
                    company: companyId,
                    category: categoryId || null,
                    size: sizeId,
                    potency: potencyId || null,
                    useType: useTypeId || null,       // ★ single value
                    lowStockThreshold: lowStockThreshold || 10,
                    hsnCode: hsnCode || '3004',
                });

                createdProducts.push(product._id);
            } catch (err) {
                errors.push({
                    company: companyId,
                    category: categoryId,
                    size: sizeId,
                    potency: potencyId,
                    useType: useTypeId,
                    error: err.message,
                });
            }
        }

        // Fetch created products with full population
        const populatedProducts = await Product.find({
            _id: { $in: createdProducts },
        })
            .populate('medicine', 'name shortName')
            .populate('company', 'name')
            .populate('category', 'name')
            .populate('size', 'name volume unit')
            .populate('potency', 'name scale')
            .populate('useType', 'name');              // ★ changed

        res.status(201).json({
            success: true,
            message: `${createdProducts.length} variant(s) created. ${skippedProducts.length} skipped.`,
            data: populatedProducts,
            summary: {
                created: createdProducts.length,
                skipped: skippedProducts.length,
                failed: errors.length,
                totalCombinations: combinations.length,
            },
            skippedDetails: skippedProducts,
            errors,
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
// @desc    Get all products
// @route   GET /api/products
// @access  Private
// ============================================
const getAllProducts = async (req, res) => {
    try {
        const {
            search, medicine, company, category, size, potency, useType,
            productType, lowStock, expired, isActive, page = 1, limit = 20,
            sortBy = 'createdAt', sortOrder = 'desc',
        } = req.query;

        const filter = {};

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

        if (medicine) filter.medicine = medicine;
        if (company) filter.company = company;
        if (category) filter.category = category;
        if (size) filter.size = size;
        if (potency) filter.potency = potency;
        if (useType) filter.useType = useType;          // ★ changed from useTypes

        if (productType === 'medicine') filter.medicine = { $ne: null };
        else if (productType === 'general') filter.medicine = null;

        if (lowStock === 'true') {
            filter.$expr = { $lte: ['$stock', '$lowStockThreshold'] };
        }

        if (expired === 'true') {
            filter['batches.expiryDate'] = { $lt: new Date() };
            filter['batches.quantity'] = { $gt: 0 };
        }

        if (isActive !== undefined) filter.isActive = isActive === 'true';

        const skip = (page - 1) * limit;
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const products = await Product.find(filter)
            .populate('medicine', 'name shortName')
            .populate('company', 'name')
            .populate('category', 'name')
            .populate('size', 'name volume unit')
            .populate('potency', 'name scale')
            .populate('useType', 'name')                // ★ changed
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
// @desc    Update single product variant
// ============================================
const updateProduct = async (req, res) => {
    try {
        const {
            productName, medicine, company, category, size, potency,
            useType, lowStockThreshold, hsnCode, isActive,           // ★ useType
        } = req.body;

        let product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

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
                productName: productName !== undefined ? productName : product.productName,
                medicine: medicine !== undefined ? medicine : product.medicine,
                company: company || product.company,
                category: category !== undefined ? category : product.category,
                size: size || product.size,
                potency: potency !== undefined ? potency : product.potency,
                useType: useType !== undefined ? useType : product.useType,  // ★ changed
                lowStockThreshold: lowStockThreshold !== undefined ? lowStockThreshold : product.lowStockThreshold,
                hsnCode: hsnCode || product.hsnCode,
                isActive: isActive !== undefined ? isActive : product.isActive,
            },
            { new: true, runValidators: true }
        )
            .populate('medicine', 'name shortName')
            .populate('company', 'name')
            .populate('category', 'name')
            .populate('size', 'name volume unit')
            .populate('potency', 'name scale')
            .populate('useType', 'name');               // ★ changed

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
const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('medicine', 'name shortName commonUses')
            .populate('company', 'name phone email')
            .populate('category', 'name')
            .populate('size', 'name volume unit')
            .populate('potency', 'name scale level')
            .populate('useType', 'name description');   // ★ changed

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.status(200).json({ success: true, data: product });
    } catch (error) {
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// ============================================
const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('medicine', 'name')
            .populate('company', 'name');

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        if (product.stock > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete. Product has ${product.stock} units in stock.`,
            });
        }

        const displayName = product.medicine ? product.medicine.name : product.productName;
        await Product.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: `Product '${displayName}' deleted successfully`,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// ============================================
const getLowStockProducts = async (req, res) => {
    try {
        const products = await Product.find({
            $expr: { $lte: ['$stock', '$lowStockThreshold'] },
            isActive: true,
            stock: { $gt: 0 },
        })
            .populate('medicine', 'name shortName')
            .populate('company', 'name')
            .populate('category', 'name')
            .populate('size', 'name')
            .populate('potency', 'name')
            .populate('useType', 'name')                // ★ changed
            .sort({ stock: 1 });

        res.status(200).json({
            success: true,
            count: products.length,
            message: products.length > 0 ? `⚠️ ${products.length} products low on stock` : '✅ All good',
            data: products,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// ============================================
const getExpiredProducts = async (req, res) => {
    try {
        const products = await Product.find({
            'batches.expiryDate': { $lt: new Date() },
            'batches.quantity': { $gt: 0 },
            isActive: true,
        })
            .populate('medicine', 'name shortName')
            .populate('company', 'name')
            .populate('category', 'name')
            .populate('size', 'name')
            .populate('potency', 'name')
            .populate('useType', 'name')                // ★ changed
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: products.length,
            message: products.length > 0 ? `🚨 ${products.length} expired batches` : '✅ No expired',
            data: products,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
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