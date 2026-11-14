const mongoose = require('mongoose');
const Product = require('../models/Product');
const StockTransaction = require('../models/StockTransaction');

// ============================================
// @desc    Add stock (new batch) to a product
// @route   POST /api/stock/add
// @access  Private
// ============================================
const addStock = async (req, res) => {
    try {
        const {
            productId,
            batchNumber,
            quantity,
            purchasePrice,
            mrp,
            sellingPriceCustomer,
            sellingPriceDoctor,
            expiryDate,
            rackLocation,
            reasonNote,
        } = req.body;

        if (!productId || !quantity || !purchasePrice || !mrp) {
            return res.status(400).json({
                success: false,
                message: 'Product, quantity, purchase price, and MRP are required',
            });
        }

        if (quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be greater than 0',
            });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found',
            });
        }

        const stockBefore = product.stock;

        const newBatch = {
            batchNumber: batchNumber || `B${Date.now()}`,
            quantity: Number(quantity),
            purchasePrice: Number(purchasePrice),
            mrp: Number(mrp),
            sellingPriceCustomer: Number(sellingPriceCustomer) || Number(mrp),
            sellingPriceDoctor: Number(sellingPriceDoctor) || Number(mrp),
            expiryDate: expiryDate || null,
            rackLocation: rackLocation || '',
            addedAt: new Date(),
        };

        product.batches.push(newBatch);
        product.recalculateStock();
        await product.save();

        const addedBatch = product.batches[product.batches.length - 1];

        await StockTransaction.create({
            product: product._id,
            type: 'IN',
            quantity: Number(quantity),
            batchId: addedBatch._id,
            batchNumber: newBatch.batchNumber,
            unitPrice: Number(purchasePrice),
            mrp: Number(mrp),
            totalValue: Number(quantity) * Number(purchasePrice),
            reason: 'purchase',
            reasonNote: reasonNote || '',
            stockBefore,
            stockAfter: product.stock,
            performedBy: req.user.id,
        });

        const populatedProduct = await Product.findById(product._id)
            .populate('medicine', 'name shortName')
            .populate('company', 'name')
            .populate('category', 'name')
            .populate('size', 'name')
            .populate('potency', 'name');

        res.status(200).json({
            success: true,
            message: `${quantity} units added to stock (Batch: ${newBatch.batchNumber})`,
            data: populatedProduct,
        });
    } catch (error) {
        console.error('Add Stock Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error while adding stock',
            error: error.message,
        });
    }
};

// ============================================
// @desc    Remove stock from a product
// @route   POST /api/stock/remove
// @access  Private
// ============================================
const removeStock = async (req, res) => {
    try {
        const {
            productId,
            batchId,       // Optional: remove from specific batch
            quantity,
            reason,        // 'damaged', 'expired', 'adjustment_remove', 'other'
            reasonNote,
        } = req.body;

        if (!productId || !quantity || !reason) {
            return res.status(400).json({
                success: false,
                message: 'Product, quantity, and reason are required',
            });
        }

        if (quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be greater than 0',
            });
        }

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found',
            });
        }

        if (product.stock < quantity) {
            return res.status(400).json({
                success: false,
                message: `Cannot remove ${quantity} units. Only ${product.stock} available.`,
            });
        }

        const stockBefore = product.stock;
        let removedFromBatch = '';
        let unitPrice = 0;
        let removedBatchId = null;

        if (batchId) {
            // Remove from specific batch
            const batch = product.batches.id(batchId);
            if (!batch) {
                return res.status(404).json({
                    success: false,
                    message: 'Batch not found',
                });
            }
            if (batch.quantity < quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot remove ${quantity} from batch. Only ${batch.quantity} available in this batch.`,
                });
            }
            batch.quantity -= quantity;
            removedFromBatch = batch.batchNumber;
            unitPrice = batch.purchasePrice;
            removedBatchId = batch._id;
        } else {
            // FIFO: Remove from oldest batches first
            let remaining = quantity;
            for (const batch of product.batches) {
                if (remaining <= 0) break;
                if (batch.quantity <= 0) continue;

                const removeFromThis = Math.min(batch.quantity, remaining);
                batch.quantity -= removeFromThis;
                remaining -= removeFromThis;

                if (!removedFromBatch) {
                    removedFromBatch = batch.batchNumber;
                    unitPrice = batch.purchasePrice;
                    removedBatchId = batch._id;
                }
            }
        }

        // Remove empty batches
        product.batches = product.batches.filter((b) => b.quantity > 0);

        product.recalculateStock();
        await product.save();

        // Log transaction
        await StockTransaction.create({
            product: product._id,
            type: 'OUT',
            quantity: Number(quantity),
            batchId: removedBatchId,
            batchNumber: removedFromBatch,
            unitPrice,
            totalValue: Number(quantity) * unitPrice,
            reason,
            reasonNote: reasonNote || '',
            stockBefore,
            stockAfter: product.stock,
            performedBy: req.user.id,
        });

        const populatedProduct = await Product.findById(product._id)
            .populate('medicine', 'name shortName')
            .populate('company', 'name')
            .populate('category', 'name')
            .populate('size', 'name')
            .populate('potency', 'name');

        res.status(200).json({
            success: true,
            message: `${quantity} units removed from stock`,
            data: populatedProduct,
        });
    } catch (error) {
        console.error('Remove Stock Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error while removing stock',
            error: error.message,
        });
    }
};

// ============================================
// @desc    Get batches of a product
// @route   GET /api/stock/batches/:productId
// @access  Private
// ============================================
const getProductBatches = async (req, res) => {
    try {
        const product = await Product.findById(req.params.productId)
            .populate('medicine', 'name shortName')
            .populate('company', 'name')
            .populate('size', 'name')
            .populate('potency', 'name');

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found',
            });
        }

        const displayName = product.medicine?.name || product.productName;

        res.status(200).json({
            success: true,
            data: {
                productId: product._id,
                displayName,
                company: product.company?.name,
                size: product.size?.name,
                potency: product.potency?.name,
                totalStock: product.stock,
                batches: product.batches.sort(
                    (a, b) => new Date(a.addedAt) - new Date(b.addedAt)
                ),
            },
        });
    } catch (error) {
        console.error('Get Batches Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message,
        });
    }
};

// ============================================
// @desc    Get stock transaction history
// @route   GET /api/stock/transactions
// @access  Private
// ============================================
const getTransactions = async (req, res) => {
    try {
        const {
            productId,
            type,
            reason,
            fromDate,
            toDate,
            page = 1,
            limit = 30,
        } = req.query;

        const filter = {};

        if (productId) filter.product = productId;
        if (type) filter.type = type;
        if (reason) filter.reason = reason;

        if (fromDate || toDate) {
            filter.transactionDate = {};
            if (fromDate) {
                const start = new Date(fromDate);
                start.setHours(0, 0, 0, 0);
                filter.transactionDate.$gte = start;
            }
            if (toDate) {
                const end = new Date(toDate);
                end.setHours(23, 59, 59, 999);
                filter.transactionDate.$lte = end;
            }
        }

        const skip = (page - 1) * limit;

        const transactions = await StockTransaction.find(filter)
            .populate('product', 'productName medicine')
            .populate({
                path: 'product',
                populate: { path: 'medicine', select: 'name shortName' },
            })
            .populate('performedBy', 'name')
            .populate('saleRef', 'saleNumber')
            .sort({ transactionDate: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await StockTransaction.countDocuments(filter);

        res.status(200).json({
            success: true,
            count: transactions.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            data: transactions,
        });
    } catch (error) {
        console.error('Get Transactions Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message,
        });
    }
};

// ============================================
// @desc    Quick Sale (removes stock as "sold")
// @route   POST /api/stock/sell
// @access  Private
// This is a simple version. Full POS will replace this later.
// ============================================
const quickSell = async (req, res) => {
    try {
        const {
            productId,
            batchId,
            quantity,
            sellingPrice,  // Actual price customer paid (can differ from MRP)
            customerName,
            customerPhone,
            paymentMethod,
            reasonNote,
        } = req.body;

        if (!productId || !quantity || !sellingPrice) {
            return res.status(400).json({
                success: false,
                message: 'Product, quantity, and selling price are required',
            });
        }

        if (quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be greater than 0',
            });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found',
            });
        }

        if (product.stock < quantity) {
            return res.status(400).json({
                success: false,
                message: `Insufficient stock. Available: ${product.stock}, Requested: ${quantity}`,
            });
        }

        const stockBefore = product.stock;
        let soldFromBatch = '';
        let batchPurchasePrice = 0;
        let batchMrp = 0;
        let soldBatchId = null;

        if (batchId) {
            // Sell from specific batch
            const batch = product.batches.id(batchId);
            if (!batch) {
                return res.status(404).json({
                    success: false,
                    message: 'Batch not found',
                });
            }
            if (batch.quantity < quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Only ${batch.quantity} units in selected batch`,
                });
            }
            batch.quantity -= quantity;
            soldFromBatch = batch.batchNumber;
            batchPurchasePrice = batch.purchasePrice;
            batchMrp = batch.mrp;
            soldBatchId = batch._id;
        } else {
            // FIFO: Sell from oldest batch first
            let remaining = quantity;
            for (const batch of product.batches) {
                if (remaining <= 0) break;
                if (batch.quantity <= 0) continue;

                const sellFromThis = Math.min(batch.quantity, remaining);
                batch.quantity -= sellFromThis;
                remaining -= sellFromThis;

                if (!soldFromBatch) {
                    soldFromBatch = batch.batchNumber;
                    batchPurchasePrice = batch.purchasePrice;
                    batchMrp = batch.mrp;
                    soldBatchId = batch._id;
                }
            }
        }

        // Remove empty batches
        product.batches = product.batches.filter((b) => b.quantity > 0);
        product.recalculateStock();
        await product.save();

        // Build notes with customer info for traceability
        const notes = [
            customerName && `Customer: ${customerName}`,
            customerPhone && `Phone: ${customerPhone}`,
            paymentMethod && `Payment: ${paymentMethod}`,
            reasonNote,
        ]
            .filter(Boolean)
            .join(' | ');

        // Log transaction
        await StockTransaction.create({
            product: product._id,
            type: 'OUT',
            quantity: Number(quantity),
            batchId: soldBatchId,
            batchNumber: soldFromBatch,
            unitPrice: Number(sellingPrice),
            mrp: batchMrp,
            totalValue: Number(quantity) * Number(sellingPrice),
            reason: 'sale',
            reasonNote: notes || 'Quick sale',
            stockBefore,
            stockAfter: product.stock,
            performedBy: req.user.id,
        });

        res.status(200).json({
            success: true,
            message: `✅ Sold ${quantity} units of ${product.productName || 'product'} for ₹${Number(quantity) * Number(sellingPrice)}`,
            data: {
                productId: product._id,
                newStock: product.stock,
                saleAmount: Number(quantity) * Number(sellingPrice),
                profit: (Number(sellingPrice) - batchPurchasePrice) * Number(quantity),
            },
        });
    } catch (error) {
        console.error('Quick Sell Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error during sale',
            error: error.message,
        });
    }
};

module.exports = {
    addStock,
    removeStock,
    getProductBatches,
    getTransactions,
    quickSell,
};