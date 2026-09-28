const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Medicine name is required'],
            unique: true,
            trim: true,
            maxlength: [100, 'Medicine name cannot exceed 100 characters'],
            // Examples: Arnica Montana, Nux Vomica, Rhus Toxicodendron
        },
        shortName: {
            type: String,
            trim: true,
            default: '',
            // Examples: Arnica, Nux Vom, Rhus Tox
        },
        commonUses: {
            type: String,
            trim: true,
            maxlength: [500, 'Common uses cannot exceed 500 characters'],
            default: '',
            // Example: "Injuries, bruises, muscle pain, shock"
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

const Medicine = mongoose.model('Medicine', medicineSchema);

module.exports = Medicine;