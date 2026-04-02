const express = require('express');
const router = express.Router();
const Plan = require('../models/Plan');

router.post('/generate', async (req, res) => {
    try {
        const { goal, dailyTime, durationWeeks } = req.body;

        // dummy roadmap (later AI replace karega)
        const topics = [
            "Arrays",
            "Sliding Window",
            "Binary Search",
            "Recursion",
            "DP",
            "Graphs"
        ];

        const roadmap = topics.slice(0, durationWeeks).map((topic, index) => ({
            week: index + 1,
            topic,
            sessions: Math.floor((dailyTime * 7) / 60)
        }));

        const plan = new Plan({
            goal,
            dailyTime,
            durationWeeks,
            roadmap
        });

        await plan.save();

        res.json(plan);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;