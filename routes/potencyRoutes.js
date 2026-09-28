const express = require('express');
const router = express.Router();
const {
    createPotency,
    getAllPotencies,
    getPotencyById,
    updatePotency,
    deletePotency,
} = require('../controllers/potencyController');
const { protect } = require('../middlewares/authMiddleware');

// All routes protected
router.use(protect);

router
    .route('/')
    .post(createPotency)
    .get(getAllPotencies);

router
    .route('/:id')
    .get(getPotencyById)
    .put(updatePotency)
    .delete(deletePotency);

module.exports = router;