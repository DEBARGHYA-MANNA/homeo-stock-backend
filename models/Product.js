const mongoose = require('mongoose');

// ============================================
// BATCH SCHEMA (unchanged)
// ============================================
const batchSchema = new mongoose.Schema(
    {
        batchNumber: { type: String, trim: true, default: '' },
        quantity: {
            type: Number,
            required: [true, 'Batch quantity is required'],
            min: [0, 'Quantity cannot be negative'],
            default: 0,
        },
        purchasePrice: {
            type: Number,
            required: [true, 'Purchase price is required'],
            min: [0, 'Price cannot be negative'],
        },
        mrp: {
            type: Number,
            required: [true, 'MRP is required'],
            min: [0, 'MRP cannot be negative'],
        },
        sellingPriceCustomer: { type: Number, default: 0, min: 0 },
        sellingPriceDoctor: { type: Number, default: 0, min: 0 },
        expiryDate: { type: Date, default: null },
        rackLocation: { type: String, trim: true, default: '' },
        addedAt: { type: Date, default: Date.now },
    },
    { _id: true }
);

const productSchema = new mongoose.Schema(
    {
        productName: {
            type: String,
            trim: true,
            maxlength: [100, 'Product name cannot exceed 100 characters'],
            default: '',
        },
        medicine: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Medicine',
            default: null,
        },
        // ── Each variant stores ONE of each ──
        company: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company',
            required: [true, 'Company is required'],
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            default: null,
        },
        size: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Size',
            required: [true, 'Size is required'],
        },
        potency: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Potency',
            default: null,
        },

        // useTypes (array) 
        useType: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'UseType',
        }],

        // Batches
        batches: [batchSchema],

        // Aggregate stock
        stock: { type: Number, default: 0, min: 0 },
        lowStockThreshold: { type: Number, default: 10 },

        // Default pricing (from latest batch)
        mrp: { type: Number, default: 0, min: 0 },
        purchasePrice: { type: Number, default: 0, min: 0 },
        sellingPriceCustomer: { type: Number, default: 0, min: 0 },
        sellingPriceDoctor: { type: Number, default: 0, min: 0 },
        discount: { type: Number, default: 0, min: 0, max: 100 },

        // Storage & Tax
        rackLocation: { type: String, trim: true, default: '' },
        hsnCode: { type: String, trim: true, default: '3004' },

        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

// Recalculate stock from batches
productSchema.methods.recalculateStock = function () {
    this.stock = this.batches.reduce((sum, batch) => sum + batch.quantity, 0);
    if (this.batches.length > 0) {
        const latestBatch = this.batches[this.batches.length - 1];
        this.mrp = latestBatch.mrp;
        this.purchasePrice = latestBatch.purchasePrice;
        this.sellingPriceCustomer = latestBatch.sellingPriceCustomer || latestBatch.mrp;
        this.sellingPriceDoctor = latestBatch.sellingPriceDoctor || latestBatch.mrp;
        this.rackLocation = latestBatch.rackLocation || this.rackLocation;
    }
};

// Virtuals
productSchema.virtual('displayName').get(function () {
    if (this.medicine && this.medicine.name) return this.medicine.name;
    return this.productName || 'Unnamed Product';
});

productSchema.virtual('isLowStock').get(function () {
    return this.stock <= this.lowStockThreshold;
});

productSchema.virtual('isExpired').get(function () {
    if (this.batches.length === 0) return false;
    return this.batches.some(
        (b) => b.expiryDate && new Date(b.expiryDate) < new Date() && b.quantity > 0
    );
});

productSchema.virtual('nearestExpiry').get(function () {
    const activeBatches = this.batches.filter((b) => b.quantity > 0 && b.expiryDate);
    if (activeBatches.length === 0) return null;
    activeBatches.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
    return activeBatches[0].expiryDate;
});

productSchema.virtual('profitMargin').get(function () {
    if (this.purchasePrice === 0) return 0;
    return (((this.mrp - this.purchasePrice) / this.purchasePrice) * 100).toFixed(2);
});

productSchema.virtual('productType').get(function () {
    return this.medicine ? 'Medicine' : 'General Product';
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

const Product = mongoose.model('Product', productSchema);
module.exports = Product;