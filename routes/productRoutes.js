const express = require('express');
const router = express.Router();
const {
    createProduct,
    getAllProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    getLowStockProducts,
    getExpiredProducts,
} = require('../controllers/productController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

// Reports (must be before /:id to avoid route conflict)
router.get('/reports/low-stock', getLowStockProducts);
router.get('/reports/expired', getExpiredProducts);

// CRUD
router
    .route('/')
    .post(createProduct)
    .get(getAllProducts);

router
    .route('/:id')
    .get(getProductById)
    .put(updateProduct)
    .delete(deleteProduct);

module.exports = router;