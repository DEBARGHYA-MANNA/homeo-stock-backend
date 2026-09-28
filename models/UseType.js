const mongoose = require('mongoose');

const useTypeSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Use type name is required'],
            unique: true,
            trim: true,
            maxlength: [50, 'Use type name cannot exceed 50 characters'],
            // Examples: Cold, Cough, Muscle Pain, Constipation, Hair Care
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

const UseType = mongoose.model('UseType', useTypeSchema);

module.exports = UseType;