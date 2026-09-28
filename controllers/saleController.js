const Sale = require('../models/Sale');
const Product = require('../models/Product');

// ============================================
// HELPER: Generate unique sale number
// Format: SAL-YYYYMMDD-001
// ============================================
const generateSaleNumber = async () => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `SAL-${dateStr}-`;

    // Find the last sale of today
    const lastSale = await Sale.findOne({
        saleNumber: { $regex: `^${prefix}` },
    }).sort({ saleNumber: -1 });

    let sequence = 1;
    if (lastSale) {
        const lastSeq = parseInt(lastSale.saleNumber.split('-').pop());
        sequence = lastSeq + 1;
    }

    return `${prefix}${String(sequence).padStart(3, '0')}`;
};

// ============================================
// @desc    Create a new sale & reduce stock
// @route   POST /api/sales
// @access  Private
// ============================================
const createSale = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const {
            customerName,
            customerPhone,
            items,
            discount,
            discountType,
            paymentMethod,
            paymentStatus,
            notes,
        } = req.body;

        // Validation
        if (!items || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please add at least one item to the sale',
            });
        }

        const saleItems = [];
        let subtotal = 0;

        // Process each item and check stock
        for (const item of items) {
            const product = await Product.findById(item.productId).session(session);

            if (!product) {
                await session.abortTransaction();
                return res.status(404).json({
                    success: false,
                    message: `Product not found: ${item.productId}`,
                });
            }

            // Check if enough stock is available
            if (product.stock < item.quantity) {
                await session.abortTransaction();
                const displayName = product.productName || 'Product';
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for "${displayName}". Available: ${product.stock}, Requested: ${item.quantity}`,
                });
            }

            const unitPrice = item.unitPrice || product.mrp;
            const totalPrice = unitPrice * item.quantity;

            saleItems.push({
                product: product._id,
                productName: product.productName || '',
                company: product.company?.toString() || '',
                size: product.size?.toString() || '',
                potency: product.potency?.toString() || '',
                quantity: item.quantity,
                unitPrice,
                mrp: product.mrp,
                totalPrice,
            });

            subtotal += totalPrice;

            // Reduce stock
            product.stock -= item.quantity;
            await product.save({ session });
        }

        // Calculate discount
        let discountAmount = 0;
        if (discount && discount > 0) {
            if (discountType === 'percentage') {
                discountAmount = (subtotal * discount) / 100;
            } else {
                discountAmount = discount;
            }
        }

        const totalAmount = Math.max(0, subtotal - discountAmount);

        // Generate sale number
        const saleNumber = await generateSaleNumber();

        // Create sale document
        const sale = await Sale.create(
            [
                {
                    saleNumber,
                    customerName: customerName || 'Walk-in Customer',
                    customerPhone: customerPhone || '',
                    items: saleItems,
                    subtotal,
                    discount: discountAmount,
                    discountType: discountType || 'amount',
                    totalAmount,
                    paymentMethod: paymentMethod || 'cash',
                    paymentStatus: paymentStatus || 'paid',
                    saleDate: new Date(),
                    notes: notes || '',
                    createdBy: req.user.id,
                },
            ],
            { session }
        );

        await session.commitTransaction();

        // Populate for response
        const populatedSale = await Sale.findById(sale[0]._id)
            .populate('items.product', 'productName medicine')
            .populate('createdBy', 'name');

        res.status(201).json({
            success: true,
            message: `Sale ${saleNumber} created successfully`,
            data: populatedSale,
        });
    } catch (error) {
        await session.abortTransaction();
        console.error('Create Sale Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error while creating sale',
            error: error.message,
        });
    } finally {
        session.endSession();
    }
};

// ============================================
// @desc    Get all sales (with date filter)
// @route   GET /api/sales
// @access  Private
// ============================================
const getAllSales = async (req, res) => {
    try {
        const {
            date,
            fromDate,
            toDate,
            search,
            paymentMethod,
            status,
            page = 1,
            limit = 20,
        } = req.query;

        const filter = {};

        // Filter by specific date
        if (date) {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            filter.saleDate = { $gte: start, $lte: end };
        }

        // Filter by date range
        if (fromDate && toDate) {
            const start = new Date(fromDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(toDate);
            end.setHours(23, 59, 59, 999);
            filter.saleDate = { $gte: start, $lte: end };
        }

        // Filter by payment method
        if (paymentMethod) {
            filter.paymentMethod = paymentMethod;
        }

        // Filter by status
        if (status) {
            filter.status = status;
        } else {
            filter.status = 'completed'; // Default: only show completed
        }

        // Search by sale number or customer name
        if (search) {
            filter.$or = [
                { saleNumber: { $regex: search, $options: 'i' } },
                { customerName: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (page - 1) * limit;

        const sales = await Sale.find(filter)
            .populate('createdBy', 'name')
            .sort({ saleDate: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Sale.countDocuments(filter);

        res.status(200).json({
            success: true,
            count: sales.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            data: sales,
        });
    } catch (error) {
        console.error('Get Sales Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error while fetching sales',
            error: error.message,
        });
    }
};

// ============================================
// @desc    Get today's sales summary
// @route   GET /api/sales/summary/today
// @access  Private
// ============================================
const getTodaySummary = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const result = await Sale.aggregate([
            {
                $match: {
                    saleDate: { $gte: today, $lte: endOfDay },
                    status: 'completed',
                },
            },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: 1 },
                    totalRevenue: { $sum: '$totalAmount' },
                    totalDiscount: { $sum: '$discount' },
                    totalItems: { $sum: { $size: '$items' } },
                    avgSaleValue: { $avg: '$totalAmount' },
                },
            },
        ]);

        const summary = result[0] || {
            totalSales: 0,
            totalRevenue: 0,
            totalDiscount: 0,
            totalItems: 0,
            avgSaleValue: 0,
        };

        // Payment method breakdown
        const paymentBreakdown = await Sale.aggregate([
            {
                $match: {
                    saleDate: { $gte: today, $lte: endOfDay },
                    status: 'completed',
                },
            },
            {
                $group: {
                    _id: '$paymentMethod',
                    count: { $sum: 1 },
                    amount: { $sum: '$totalAmount' },
                },
            },
        ]);

        res.status(200).json({
            success: true,
            data: {
                ...summary,
                totalRevenue: Math.round(summary.totalRevenue),
                totalDiscount: Math.round(summary.totalDiscount),
                avgSaleValue: Math.round(summary.avgSaleValue),
                paymentBreakdown,
            },
        });
    } catch (error) {
        console.error('Today Summary Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message,
        });
    }
};

// ============================================
// @desc    Get single sale by ID
// @route   GET /api/sales/:id
// @access  Private
// ============================================
const getSaleById = async (req, res) => {
    try {
        const sale = await Sale.findById(req.params.id)
            .populate('items.product', 'productName medicine mrp')
            .populate('createdBy', 'name email');

        if (!sale) {
            return res.status(404).json({
                success: false,
                message: 'Sale not found',
            });
        }

        res.status(200).json({
            success: true,
            data: sale,
        });
    } catch (error) {
        console.error('Get Sale Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message,
        });
    }
};

// ============================================
// @desc    Cancel a sale & restore stock
// @route   PUT /api/sales/:id/cancel
// @access  Private
// ============================================
const cancelSale = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const sale = await Sale.findById(req.params.id).session(session);

        if (!sale) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: 'Sale not found',
            });
        }

        if (sale.status === 'cancelled') {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'Sale is already cancelled',
            });
        }

        // Restore stock for each item
        for (const item of sale.items) {
            const product = await Product.findById(item.product).session(session);
            if (product) {
                product.stock += item.quantity;
                await product.save({ session });
            }
        }

        // Mark sale as cancelled
        sale.status = 'cancelled';
        await sale.save({ session });

        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: `Sale ${sale.saleNumber} cancelled and stock restored`,
        });
    } catch (error) {
        await session.abortTransaction();
        console.error('Cancel Sale Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error while cancelling sale',
            error: error.message,
        });
    } finally {
        session.endSession();
    }
};

// Need mongoose for sessions
const mongoose = require('mongoose');

module.exports = {
    createSale,
    getAllSales,
    getTodaySummary,
    getSaleById,
    cancelSale,
};