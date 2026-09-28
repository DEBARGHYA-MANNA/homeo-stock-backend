const express = require('express');
const router = express.Router();
const {
    createUseType,
    getAllUseTypes,
    getUseTypeById,
    updateUseType,
    deleteUseType,
} = require('../controllers/useTypeController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router
    .route('/')
    .post(createUseType)
    .get(getAllUseTypes);

router
    .route('/:id')
    .get(getUseTypeById)
    .put(updateUseType)
    .delete(deleteUseType);

module.exports = router;