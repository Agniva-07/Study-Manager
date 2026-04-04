const express = require('express');
const router = express.Router();

const {
  signup,
  login,
  getMe
} = require('../controllers/authController');

const { protect } = require('../middleware/authMiddleware');

router.get('/me', protect, getMe);

// Routes
router.post('/signup', signup);
router.post('/login', login);
router.get('/me', getMe); // will protect later

module.exports = router;