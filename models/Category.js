const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Category name is required'],
            unique: true,
            trim: true,
            maxlength: [50, 'Category name cannot exceed 50 characters'],
            // Examples: Mother Tincture, Dilution, Tablet, Globules, Bio-Chemic
        },
        description: {
            type: String,
            trim: true,
            maxlength: [300, 'Description cannot exceed 300 characters'],
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

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;