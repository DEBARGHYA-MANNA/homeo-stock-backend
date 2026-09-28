const express = require('express');
const router = express.Router();
const {
    createSale,
    getAllSales,
    getTodaySummary,
    getSaleById,
    cancelSale,
} = require('../controllers/saleController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.post('/', createSale);
router.get('/summary/today', getTodaySummary);
router.get('/', getAllSales);
router.get('/:id', getSaleById);
router.put('/:id/cancel', cancelSale);

module.exports = router;