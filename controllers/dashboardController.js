const Product = require('../models/Product');
const Medicine = require('../models/Medicine');
const Company = require('../models/Company');
const Category = require('../models/Category');
const Size = require('../models/Size');
const Potency = require('../models/Potency');
const UseType = require('../models/UseType');

// ============================================
// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
// ============================================
const getStats = async (req, res) => {
    try {
        // Run all counts in parallel for speed
        const [
            totalProducts,
            totalMedicines,
            totalCompanies,
            totalCategories,
            totalSizes,
            totalPotencies,
            totalUseTypes,
            medicineProducts,
            generalProducts,
            lowStockProducts,
            expiredProducts,
            outOfStockProducts,
            activeProducts,
            stockValueResult,
        ] = await Promise.all([
            Product.countDocuments({ isActive: true }),
            Medicine.countDocuments({ isActive: true }),
            Company.countDocuments({ isActive: true }),
            Category.countDocuments({ isActive: true }),
            Size.countDocuments({ isActive: true }),
            Potency.countDocuments({ isActive: true }),
            UseType.countDocuments({ isActive: true }),

            // Medicine vs General product count
            Product.countDocuments({ medicine: { $ne: null }, isActive: true }),
            Product.countDocuments({ medicine: null, isActive: true }),

            // Low stock: stock <= lowStockThreshold
            Product.countDocuments({
                isActive: true,
                $expr: { $lte: ['$stock', '$lowStockThreshold'] },
            }),

            // Expired: expiryDate < today
            Product.countDocuments({
                isActive: true,
                expiryDate: { $lt: new Date() },
            }),

            // Out of stock: stock === 0
            Product.countDocuments({ isActive: true, stock: 0 }),

            // Total active products
            Product.countDocuments({ isActive: true }),

            // Total stock value (sum of stock * purchasePrice)
            Product.aggregate([
                { $match: { isActive: true } },
                {
                    $group: {
                        _id: null,
                        totalPurchaseValue: {
                            $sum: { $multiply: ['$stock', '$purchasePrice'] },
                        },
                        totalMRPValue: {
                            $sum: { $multiply: ['$stock', '$mrp'] },
                        },
                        totalUnits: { $sum: '$stock' },
                    },
                },
            ]),
        ]);

        const stockValue = stockValueResult[0] || {
            totalPurchaseValue: 0,
            totalMRPValue: 0,
            totalUnits: 0,
        };

        res.status(200).json({
            success: true,
            data: {
                counts: {
                    totalProducts,
                    totalMedicines,
                    totalCompanies,
                    totalCategories,
                    totalSizes,
                    totalPotencies,
                    totalUseTypes,
                    medicineProducts,
                    generalProducts,
                    activeProducts,
                },
                alerts: {
                    lowStock: lowStockProducts,
                    expired: expiredProducts,
                    outOfStock: outOfStockProducts,
                },
                stockValue: {
                    totalPurchaseValue: Math.round(stockValue.totalPurchaseValue),
                    totalMRPValue: Math.round(stockValue.totalMRPValue),
                    totalUnits: stockValue.totalUnits,
                    potentialProfit: Math.round(
                        stockValue.totalMRPValue - stockValue.totalPurchaseValue
                    ),
                },
            },
        });
    } catch (error) {
        console.error('Dashboard Stats Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error while fetching dashboard stats',
            error: error.message,
        });
    }
};

module.exports = { getStats };