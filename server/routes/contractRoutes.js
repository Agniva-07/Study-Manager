const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { handleValidation } = require('../middleware/validationMiddleware');
const { validateContractCreate } = require('../validators');
const {
  createContract,
  getCurrentContract,
  getContractReview,
} = require('../controllers/contractController');

// ==============================
// CREATE CONTRACT
// ==============================
router.post('/', protect, validateContractCreate, handleValidation, createContract);


// ==============================
// GET CURRENT CONTRACT
// ==============================
router.get('/current', protect, getCurrentContract);


// ==============================
// REVIEW CONTRACT
// ==============================
router.get('/review', protect, getContractReview);

module.exports = router;