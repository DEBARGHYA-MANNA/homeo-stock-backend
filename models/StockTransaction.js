const mongoose = require('mongoose');

const stockTransactionSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        },
        type: {
            type: String,
            enum: ['IN', 'OUT', 'ADJUSTMENT'],
            required: true,
            // IN = stock added (purchase)
            // OUT = stock removed (sale, damage, expired)
            // ADJUSTMENT = manual correction
        },
        quantity: {
            type: Number,
            required: true,
            min: [1, 'Quantity must be at least 1'],
        },
        batchId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
            // Which batch was affected
        },
        batchNumber: {
            type: String,
            trim: true,
            default: '',
        },
        // Pricing at time of transaction
        unitPrice: {
            type: Number,
            default: 0,
        },
        mrp: {
            type: Number,
            default: 0,
        },
        totalValue: {
            type: Number,
            default: 0,
        },
        // Reason/Source
        reason: {
            type: String,
            enum: [
                'purchase',         // New stock purchased
                'sale',             // Sold to customer
                'damaged',          // Products damaged
                'expired',          // Products expired
                'returned',         // Customer return
                'adjustment_add',   // Manual stock addition
                'adjustment_remove',// Manual stock removal
                'opening_stock',    // Initial stock entry
                'transfer',         // Transferred to another location
                'other',
            ],
            required: true,
        },
        reasonNote: {
            type: String,
            trim: true,
            default: '',
        },
        // Reference to sale if applicable
        saleRef: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Sale',
            default: null,
        },
        // Stock levels after transaction
        stockBefore: {
            type: Number,
            default: 0,
        },
        stockAfter: {
            type: Number,
            default: 0,
        },
        // Who did this
        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        transactionDate: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for fast queries
stockTransactionSchema.index({ product: 1, transactionDate: -1 });
stockTransactionSchema.index({ type: 1, transactionDate: -1 });

const StockTransaction = mongoose.model('StockTransaction', stockTransactionSchema);

module.exports = StockTransaction;