const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
    {
        // ============================================
        // PRODUCT IDENTITY
        // ============================================
        // For medicine products: medicine ref is used
        // For general products (shampoo, oil): productName is used
        productName: {
            type: String,
            trim: true,
            maxlength: [100, 'Product name cannot exceed 100 characters'],
            default: '',
            // Example: "Anti-Dandruff Shampoo", "Hair Oil", "Skin Cream"
        },
        medicine: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Medicine',
            default: null,
            // Optional! Only for homeopathic medicines like Arnica, Nux Vom
        },

        // ============================================
        // REFERENCES (some now optional)
        // ============================================
        company: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company',
            required: [true, 'Company is required'],
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: [true, 'Category is required'],
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
            // Optional! Not applicable for shampoo, oil, cream, etc.
        },

        // ============================================
        // USE TYPES (Many-to-Many)
        // ============================================
        useTypes: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'UseType',
            },
        ],
        // Example: [Cold, Cough, Fever] for a medicine
        // Example: [Hair Care, Dandruff] for a shampoo

        // ============================================
        // PRICING
        // ============================================
        mrp: {
            type: Number,
            required: [true, 'MRP is required'],
            min: [0, 'MRP cannot be negative'],
        },
        purchasePrice: {
            type: Number,
            required: [true, 'Purchase price is required'],
            min: [0, 'Purchase price cannot be negative'],
        },
        discount: {
            type: Number,
            default: 0,
            min: [0, 'Discount cannot be negative'],
            max: [100, 'Discount cannot exceed 100%'],
        },

        // ============================================
        // STOCK / INVENTORY
        // ============================================
        stock: {
            type: Number,
            required: [true, 'Stock quantity is required'],
            min: [0, 'Stock cannot be negative'],
            default: 0,
        },
        lowStockThreshold: {
            type: Number,
            default: 10,
        },

        // ============================================
        // BATCH & EXPIRY
        // ============================================
        batchNumber: {
            type: String,
            trim: true,
            default: '',
        },
        expiryDate: {
            type: Date,
            default: null,
        },

        // ============================================
        // STORAGE & TAX
        // ============================================
        rackLocation: {
            type: String,
            trim: true,
            default: '',
        },
        hsnCode: {
            type: String,
            trim: true,
            default: '3004',
        },

        // ============================================
        // STATUS
        // ============================================
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// ============================================
// VIRTUAL: Display name
// If medicine exists → use medicine name
// If not → use productName
// ============================================
productSchema.virtual('displayName').get(function () {
    if (this.medicine && this.medicine.name) {
        return this.medicine.name;
    }
    return this.productName || 'Unnamed Product';
});

// ============================================
// VIRTUAL: Check if stock is low
// ============================================
productSchema.virtual('isLowStock').get(function () {
    return this.stock <= this.lowStockThreshold;
});

// ============================================
// VIRTUAL: Check if expired
// ============================================
productSchema.virtual('isExpired').get(function () {
    if (!this.expiryDate) return false;
    return new Date(this.expiryDate) < new Date();
});

// ============================================
// VIRTUAL: Profit margin per unit
// ============================================
productSchema.virtual('profitMargin').get(function () {
    if (this.purchasePrice === 0) return 0;
    return (((this.mrp - this.purchasePrice) / this.purchasePrice) * 100).toFixed(2);
});

// ============================================
// VIRTUAL: Product type label
// ============================================
productSchema.virtual('productType').get(function () {
    return this.medicine ? 'Medicine' : 'General Product';
});

// Make sure virtuals are included in JSON output
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;