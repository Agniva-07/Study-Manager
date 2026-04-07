const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  getLeaderboard,
  getPublicProfile,
  getWeeklyStats,
} = require('../controllers/socialController');

const router = express.Router();

router.get('/leaderboard', protect, getLeaderboard);
router.get('/users/:id/profile', protect, getPublicProfile);
router.get('/users/:id/weekly-stats', protect, getWeeklyStats);

module.exports = router;
