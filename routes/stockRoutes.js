const express = require('express');
const router = express.Router();
const {
    addStock,
    removeStock,
    getProductBatches,
    getTransactions,
    quickSell,
} = require('../controllers/stockController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.post('/add', addStock);
router.post('/remove', removeStock);
router.post('/sell', quickSell);  
router.get('/batches/:productId', getProductBatches);
router.get('/transactions', getTransactions);

module.exports = router;