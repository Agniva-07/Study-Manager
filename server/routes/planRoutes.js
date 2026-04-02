const express = require('express');
const router = express.Router();
const Plan = require('../models/Plan');

const { generateRoadmap } = require("../services/aiService");

router.post("/generate", async (req, res) => {
  try {
    const { goal, dailyTime, durationWeeks } = req.body;

    const roadmap = await generateRoadmap(
      goal,
      dailyTime,
      durationWeeks
    );

    res.json(roadmap);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;