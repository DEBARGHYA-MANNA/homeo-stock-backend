const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Company name is required'],
            unique: true,
            trim: true,
            maxlength: [100, 'Company name cannot exceed 100 characters'],
        },
        description: {
            type: String,
            trim: true,
            maxlength: [500, 'Description cannot exceed 500 characters'],
            default: '',
        },
        contactPerson: {
            type: String,
            trim: true,
            default: '',
        },
        phone: {
            type: String,
            trim: true,
            default: '',
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            default: '',
        },
        address: {
            type: String,
            trim: true,
            default: '',
        },
        country: {
            type: String,
            trim: true,
            default: 'India',
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

const Company = mongoose.model('Company', companySchema);

module.exports = Company;