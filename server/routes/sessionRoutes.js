const express = require('express');
const router = express.Router();
const Session = require('../models/Session');

router.post('/', async (req, res) => {
    try {
        const session = new Session(req.body);
        await session.save();

        res.status(201).json(session);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.patch('/:id', async (req, res) => {
    try {
        const updatedSession = await Session.findByIdAndUpdate(
            req.params.id,
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

router.get('/stats', async (req, res) => {
    try {
        const stats = await Session.aggregate([
            {
                $group: {
                    _id: "$section",
                    totalTime: { $sum: "$duration" }
                }
            }
        ]);

        // Step 1: initialize all sections
        const allSections = ["dsa", "dev", "semester"];
        const result = {};

        allSections.forEach(sec => {
            result[sec] = 0;
        });

        // Step 2: fill actual data
        stats.forEach(item => {
            result[item._id] = item.totalTime;
        });

        // Step 3: generate insights
        const insights = [];

        allSections.forEach(sec => {
            if (result[sec] === 0) {
                insights.push(`You are ignoring ${sec} ⚠️`);
            }
        });

        res.json({
            stats: result,
            insights: insights
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



//dashboard analytics
router.get('/dashboard', async (req, res) => {
    try {
        const sessions = await Session.find();

        let totalTime = 0;
        let signalTime = 0;
        let sectionStats = {
            dsa: 0,
            dev: 0,
            semester: 0
        };

        sessions.forEach(session => {
            // total time
            totalTime += session.duration;

            // section stats
            sectionStats[session.section] += session.duration;

            // signal time
            if (session.quality === "signal") {
                signalTime += session.duration;
            }
        });

        // calculate ratio
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

router.get('/dashboard/trends', async (req, res) => {
    try {
        const sessions = await Session.find();

        const dailyMap = {};

        sessions.forEach(session => {
            const date = new Date(session.date).toISOString().split('T')[0];

            if (!dailyMap[date]) {
                dailyMap[date] = {
                    total: 0,
                    signal: 0
                };
            }

            // total time
            dailyMap[date].total += session.duration;

            // signal time
            if (session.quality === "signal") {
                dailyMap[date].signal += session.duration;
            }
        });

        // convert to array
        const result = Object.keys(dailyMap).map(date => ({
            date,
            total: dailyMap[date].total,
            signal: dailyMap[date].signal
        }));

        // sort by date
        result.sort((a, b) => new Date(a.date) - new Date(b.date));

        res.json({ daily: result });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



//gravity score analytics 
router.get('/dashboard/gravity', async (req, res) => {
    try {
        const sessions = await Session.find();

        const sections = ["dsa", "dev", "semester"];

        // initialize
        const data = {};
        sections.forEach(sec => {
            data[sec] = {
                total: 0,
                signal: 0
            };
        });

        // fill data
        sessions.forEach(session => {
            const sec = session.section;

            data[sec].total += session.duration;

            if (session.quality === "signal") {
                data[sec].signal += session.duration;
            }
        });

        // calculate scores
        const scores = {};

        sections.forEach(sec => {
            const total = data[sec].total;
            const signal = data[sec].signal;

            const signalRatio = total === 0 ? 0 : signal / total;

            const timeFactor = total === 0 ? 1 : (1 / total);
            const qualityFactor = 1 - signalRatio;

            scores[sec] = Number((timeFactor + qualityFactor).toFixed(2));
        });

        // find max
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