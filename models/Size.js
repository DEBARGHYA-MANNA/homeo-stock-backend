const mongoose = require('mongoose');

const sizeSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Size name is required'],
            unique: true,
            trim: true,
            maxlength: [20, 'Size name cannot exceed 20 characters'],
            // Examples: 10 ml, 30 ml, 100 ml, 450 ml, 500 ml, 25 g
        },
        volume: {
            type: Number,
            required: [true, 'Volume/Weight number is required'],
            min: [0, 'Volume cannot be negative'],
            // The numeric part: 10, 30, 100, 450, 500
        },
        unit: {
            type: String,
            required: [true, 'Unit is required'],
            enum: ['ml', 'g', 'l', 'kg', 'pieces'],
            // The unit part: ml, g, l, kg
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

const Size = mongoose.model('Size', sizeSchema);

module.exports = Size;