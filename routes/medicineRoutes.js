const express = require('express');
const router = express.Router();
const {
    createMedicine,
    getAllMedicines,
    getMedicineById,
    updateMedicine,
    deleteMedicine,
} = require('../controllers/medicineController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router
    .route('/')
    .post(createMedicine)
    .get(getAllMedicines);

router
    .route('/:id')
    .get(getMedicineById)
    .put(updateMedicine)
    .delete(deleteMedicine);

module.exports = router;