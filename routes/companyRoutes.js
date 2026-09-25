const express = require('express');
const router = express.Router();
const {
    createCompany,
    getAllCompanies,
    getCompanyById,
    updateCompany,
    deleteCompany,
} = require('../controllers/companyController');
const { protect } = require('../middlewares/authMiddleware');

// All company routes are protected (user must be logged in)
router.use(protect);

router
    .route('/')
    .post(createCompany)      // POST   /api/companies
    .get(getAllCompanies);    // GET    /api/companies

router
    .route('/:id')
    .get(getCompanyById)      // GET    /api/companies/:id
    .put(updateCompany)       // PUT    /api/companies/:id
    .delete(deleteCompany);   // DELETE /api/companies/:id

module.exports = router;