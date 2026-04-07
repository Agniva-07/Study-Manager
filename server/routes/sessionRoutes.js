const express = require('express');
const router = express.Router();
const Session = require('../models/Session');

const { protect } = require('../middleware/authMiddleware');

// ✅ CREATE SESSION
router.post('/', protect, async (req, res) => {
    try {
        const { startTime: bodyStartTime, startHour: _bodyStartHour, ...rest } = req.body;

        let derivedHour;
        if (bodyStartTime != null && bodyStartTime !== '') {
            derivedHour = new Date(bodyStartTime).getHours();
        } else if (rest.date != null && rest.date !== '') {
            derivedHour = new Date(rest.date).getHours();
        } else {
            derivedHour = new Date().getHours();
        }

        const session = new Session({
            ...rest,
            userId: req.user._id,
            startHour: derivedHour,
            ...(bodyStartTime != null && bodyStartTime !== ''
                ? { startTime: new Date(bodyStartTime) }
                : {}),
        });

        await session.save();
        res.status(201).json(session);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ UPDATE SESSION
router.patch('/:id', protect, async (req, res) => {
    try {
        const updatedSession = await Session.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            req.body,
            { new: true, runValidators: true }
        );

        if (!updatedSession) {
            return res.status(404).json({ message: "Session not found" });
        }

        res.json(updatedSession);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ STATS
router.get('/stats', protect, async (req, res) => {
    try {
        const stats = await Session.aggregate([
            {
                $match: { userId: req.user._id } // 🔥 IMPORTANT
            },
            {
                $group: {
                    _id: "$section",
                    totalTime: { $sum: "$duration" }
                }
            }
        ]);

        const allSections = ["dsa", "dev", "semester"];
        const result = {};

        allSections.forEach(sec => {
            result[sec] = 0;
        });

        stats.forEach(item => {
            result[item._id] = item.totalTime;
        });

        const insights = [];

        allSections.forEach(sec => {
            if (result[sec] === 0) {
                insights.push(`You are ignoring ${sec} ⚠️`);
            }
        });

        res.json({
            stats: result,
            insights
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ DASHBOARD
router.get('/dashboard', protect, async (req, res) => {
    try {
        const sessions = await Session.find({ userId: req.user._id });

        let totalTime = 0;
        let signalTime = 0;

        let sectionStats = {
            dsa: 0,
            dev: 0,
            semester: 0
        };

        sessions.forEach(session => {
            totalTime += session.duration;
            sectionStats[session.section] += session.duration;

            if (session.quality === "signal") {
                signalTime += session.duration;
            }
        });

        const signalRatio = totalTime === 0 ? 0 : (signalTime / totalTime);

        res.json({
            totalTime,
            signalRatio: Number(signalRatio.toFixed(2)),
            sectionStats
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ TRENDS
router.get('/dashboard/trends', protect, async (req, res) => {
    try {
        const sessions = await Session.find({ userId: req.user._id });

        const dailyMap = {};

        sessions.forEach(session => {
            const date = new Date(session.date).toISOString().split('T')[0];

            if (!dailyMap[date]) {
                dailyMap[date] = { total: 0, signal: 0 };
            }

            dailyMap[date].total += session.duration;

            if (session.quality === "signal") {
                dailyMap[date].signal += session.duration;
            }
        });

        const result = Object.keys(dailyMap).map(date => ({
            date,
            total: dailyMap[date].total,
            signal: dailyMap[date].signal
        }));

        result.sort((a, b) => new Date(a.date) - new Date(b.date));

        res.json({ daily: result });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ GRAVITY
router.get('/dashboard/gravity', protect, async (req, res) => {
    try {
        const sessions = await Session.find({ userId: req.user._id });

        const sections = ["dsa", "dev", "semester"];

        const data = {};
        sections.forEach(sec => {
            data[sec] = { total: 0, signal: 0 };
        });

        sessions.forEach(session => {
            const sec = session.section;

            data[sec].total += session.duration;

            if (session.quality === "signal") {
                data[sec].signal += session.duration;
            }
        });

        const scores = {};

        sections.forEach(sec => {
            const total = data[sec].total;
            const signal = data[sec].signal;

            const signalRatio = total === 0 ? 0 : signal / total;

            const timeFactor = total === 0 ? 1 : (1 / total);
            const qualityFactor = 1 - signalRatio;

            scores[sec] = Number((timeFactor + qualityFactor).toFixed(2));
        });

        let recommendation = sections[0];

        sections.forEach(sec => {
            if (scores[sec] > scores[recommendation]) {
                recommendation = sec;
            }
        });

        res.json({
            recommendation,
            scores
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;