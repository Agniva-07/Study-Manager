const express = require('express');
const router = express.Router();
const Contract = require('../models/Contract');
const Session = require('../models/Session');


// ==============================
// CREATE CONTRACT
// ==============================
router.post('/', async (req, res) => {
    try {
        const contract = new Contract(req.body);
        await contract.save();

        res.status(201).json(contract);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// ==============================
// GET CURRENT CONTRACT
// ==============================
router.get('/current', async (req, res) => {
    try {
        const contract = await Contract.findOne().sort({ weekStart: -1 });

        if (!contract) {
            return res.status(404).json({ message: "No contract found" });
        }

        res.json(contract);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// ==============================
// REVIEW CONTRACT (MAIN LOGIC)
// ==============================
router.get('/review', async (req, res) => {
    try {
        const contract = await Contract.findOne().sort({ weekStart: -1 });

        if (!contract) {
            return res.status(404).json({ message: "No contract found" });
        }

        // calculate end of week
        const endOfWeek = new Date(contract.weekStart);
        endOfWeek.setDate(endOfWeek.getDate() + 7);

        // fetch sessions of that week
        const sessions = await Session.find({
            date: {
                $gte: contract.weekStart,
                $lt: endOfWeek
            }
        });

        // initialize progress
        const progress = {
            dsa: 0,
            dev: 0,
            semester: 0
        };

        // calculate progress (based on duration)
        sessions.forEach(session => {
            if (progress.hasOwnProperty(session.section)) {
                progress[session.section] += session.duration;
            }
        });

        // prepare result object
        const result = {
            goals: contract.goals,
            progress,
            status: {},
            percentage: {}
        };

        // calculate status + percentage
        Object.keys(progress).forEach(sec => {
            const goal = contract.goals[sec] || 0;
            const done = progress[sec];

            // status
            if (done >= goal && goal !== 0) {
                result.status[sec] = "completed";
            } else {
                result.status[sec] = "pending";
            }

            // percentage
            result.percentage[sec] = goal === 0
                ? 0
                : Math.min(100, Math.round((done / goal) * 100));
        });

        res.json(result);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


module.exports = router;