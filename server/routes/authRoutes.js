const express = require('express');
const router = express.Router();

const {
  signup,
  login,
  getMe
} = require('../controllers/authController');

const { protect } = require('../middleware/authMiddleware');
const { handleValidation } = require('../middleware/validationMiddleware');
const { validateSignup, validateLogin } = require('../validators');

router.get('/me', protect, getMe);

// Routes
router.post('/signup', validateSignup, handleValidation, signup);
router.post('/login', validateLogin, handleValidation, login);

module.exports = router;