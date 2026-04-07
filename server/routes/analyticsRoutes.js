const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const analyticsController = require('../controllers/analyticsController');

router.get('/heatmap', protect, analyticsController.getHeatmap);
router.get('/streak-dna', protect, analyticsController.getStreakDna);
router.get('/energy-profile', protect, analyticsController.getEnergyProfile);
router.get('/summary', protect, analyticsController.getSummary);

module.exports = router;
