const express = require('express');
const router = express.Router();
const Plan = require('../models/Plan');

const { generateRoadmap } = require("../services/aiService");
const { protect } = require('../middleware/authMiddleware');

// ==============================
// GENERATE PLAN
// ==============================
router.post("/generate", async (req, res) => {
  try {
    const { goal, dailyTime, durationWeeks } = req.body;

    const roadmap = await generateRoadmap(
      goal,
      dailyTime,
      durationWeeks
    );

    // 👉 If no login, just return roadmap
    if (!req.user) {
      return res.json(roadmap);
    }

    const plan = await Plan.create({
      goal,
      dailyTime,
      durationWeeks,
      roadmap,
      userId: req.user._id
    });

    res.json(plan);

  } catch (error) {
    console.error("🔥 ROUTE ERROR:", error); // ADD THIS
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;