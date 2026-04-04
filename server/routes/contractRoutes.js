const express = require('express');
const router = express.Router();
const Contract = require('../models/Contract');
const Session = require('../models/Session');

const { protect } = require('../middleware/authMiddleware');

// ==============================
// CREATE CONTRACT
// ==============================
router.post('/', protect, async (req, res) => {
    try {
        const contract = new Contract({
            ...req.body,
            userId: req.user._id
        });

        await contract.save();

        res.status(201).json(contract);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// ==============================
// GET CURRENT CONTRACT
// ==============================
router.get('/current', protect, async (req, res) => {
    try {
        const contract = await Contract.findOne({
            userId: req.user._id
        }).sort({ weekStart: -1 });

        if (!contract) {
            return res.status(404).json({ message: "No contract found" });
        }

        res.json(contract);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// ==============================
// REVIEW CONTRACT
// ==============================
router.get('/review', protect, async (req, res) => {
    try {
        const contract = await Contract.findOne({
            userId: req.user._id
        }).sort({ weekStart: -1 });

        if (!contract) {
            return res.status(404).json({ message: "No contract found" });
        }

        const endOfWeek = new Date(contract.weekStart);
        endOfWeek.setDate(endOfWeek.getDate() + 7);

        const sessions = await Session.find({
            userId: req.user._id, // 🔥 IMPORTANT
            date: {
                $gte: contract.weekStart,
                $lt: endOfWeek
            }
        });

        const progress = {
            dsa: 0,
            dev: 0,
            semester: 0
        };

        sessions.forEach(session => {
            if (progress.hasOwnProperty(session.section)) {
                progress[session.section] += session.duration;
            }
        });

        const result = {
            goals: contract.goals,
            progress,
            status: {},
            percentage: {}
        };

        Object.keys(progress).forEach(sec => {
            const goal = contract.goals[sec] || 0;
            const done = progress[sec];

            result.status[sec] =
                done >= goal && goal !== 0 ? "completed" : "pending";

            result.percentage[sec] =
                goal === 0 ? 0 : Math.min(100, Math.round((done / goal) * 100));
        });

        res.json(result);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;