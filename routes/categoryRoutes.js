const express = require('express');
const router = express.Router();
const {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
} = require('../controllers/categoryController');
const { protect } = require('../middlewares/authMiddleware');

// All routes protected
router.use(protect);

router
    .route('/')
    .post(createCategory)
    .get(getAllCategories);

router
    .route('/:id')
    .get(getCategoryById)
    .put(updateCategory)
    .delete(deleteCategory);

module.exports = router;