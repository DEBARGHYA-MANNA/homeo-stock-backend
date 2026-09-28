const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    productName: {
        type: String,
        required: true,
        // Stored as snapshot so history stays even if product name changes
    },
    company: {
        type: String,
        default: '',
    },
    size: {
        type: String,
        default: '',
    },
    potency: {
        type: String,
        default: '',
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity must be at least 1'],
    },
    unitPrice: {
        type: Number,
        required: true,
        min: [0, 'Price cannot be negative'],
        // The actual selling price per unit (may differ from MRP)
    },
    mrp: {
        type: Number,
        default: 0,
        // Original MRP for reference
    },
    totalPrice: {
        type: Number,
        required: true,
    },
});

const saleSchema = new mongoose.Schema(
    {
        saleNumber: {
            type: String,
            unique: true,
            required: true,
            // Auto-generated: SAL-20250115-001
        },
        customerName: {
            type: String,
            trim: true,
            default: 'Walk-in Customer',
        },
        customerPhone: {
            type: String,
            trim: true,
            default: '',
        },
        items: [saleItemSchema],
        subtotal: {
            type: Number,
            required: true,
            default: 0,
        },
        discount: {
            type: Number,
            default: 0,
            min: 0,
        },
        discountType: {
            type: String,
            enum: ['amount', 'percentage'],
            default: 'amount',
        },
        totalAmount: {
            type: Number,
            required: true,
            default: 0,
        },
        paymentMethod: {
            type: String,
            enum: ['cash', 'upi', 'card', 'credit', 'other'],
            default: 'cash',
        },
        paymentStatus: {
            type: String,
            enum: ['paid', 'pending', 'partial'],
            default: 'paid',
        },
        saleDate: {
            type: Date,
            default: Date.now,
        },
        notes: {
            type: String,
            trim: true,
            default: '',
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        status: {
            type: String,
            enum: ['completed', 'cancelled'],
            default: 'completed',
        },
    },
    {
        timestamps: true,
    }
);

// Index for fast date-based queries
saleSchema.index({ saleDate: -1 });
saleSchema.index({ saleNumber: 1 });

const Sale = mongoose.model('Sale', saleSchema);

module.exports = Sale;