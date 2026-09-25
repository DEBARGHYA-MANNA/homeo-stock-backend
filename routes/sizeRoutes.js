const express = require('express');
const router = express.Router();
const {
    createSize,
    getAllSizes,
    getSizeById,
    updateSize,
    deleteSize,
} = require('../controllers/sizeController');
const { protect } = require('../middlewares/authMiddleware');

// All routes protected
router.use(protect);

router
    .route('/')
    .post(createSize)
    .get(getAllSizes);

router
    .route('/:id')
    .get(getSizeById)
    .put(updateSize)
    .delete(deleteSize);

module.exports = router;