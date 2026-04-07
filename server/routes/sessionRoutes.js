const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { handleValidation } = require('../middleware/validationMiddleware');
const { validateSessionCreate, validateSessionUpdate } = require('../validators');
const {
  createSession,
  updateSession,
  getSessionStats,
  getDashboard,
  getDashboardTrends,
  getDashboardGravity,
} = require('../controllers/sessionController');

// ✅ CREATE SESSION
router.post('/', protect, validateSessionCreate, handleValidation, createSession);

// ✅ UPDATE SESSION
router.patch('/:id', protect, validateSessionUpdate, handleValidation, updateSession);

// ✅ STATS
router.get('/stats', protect, getSessionStats);

// ✅ DASHBOARD
router.get('/dashboard', protect, getDashboard);

// ✅ TRENDS
router.get('/dashboard/trends', protect, getDashboardTrends);

// ✅ GRAVITY
router.get('/dashboard/gravity', protect, getDashboardGravity);

module.exports = router;