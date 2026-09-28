const mongoose = require('mongoose');

const potencySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Potency name is required'],
            unique: true,
            trim: true,
            uppercase: true,
            maxlength: [10, 'Potency name cannot exceed 10 characters'],
            // Examples: 30CH, 200CH, 1M, 10M, CM, 3X, 6X, 12X, Q
        },
        scale: {
            type: String,
            required: [true, 'Potency scale is required'],
            enum: ['C', 'CH', 'X', 'LM', 'Q', 'M'],
            // C/CH = Centesimal, X = Decimal, LM = Fifty Millesimal, Q = Mother Tincture
        },
        level: {
            type: Number,
            default: 0,
            // Numeric value for sorting: 30CH=30, 200CH=200, 1M=1000, 10M=10000
        },
        description: {
            type: String,
            trim: true,
            default: '',
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

const Potency = mongoose.model('Potency', potencySchema);

module.exports = Potency;