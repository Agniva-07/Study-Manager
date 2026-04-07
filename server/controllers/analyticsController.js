const Session = require('../models/Session');

const SECTIONS = ['dsa', 'dev', 'semester'];

const WEEKDAY_MONDAY_FIRST = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

function utcYmd(d) {
  return d.toISOString().split('T')[0];
}

function utcWeekdayName(date) {
  const dow = date.getUTCDay();
  const idx = dow === 0 ? 6 : dow - 1;
  return WEEKDAY_MONDAY_FIRST[idx];
}

/**
 * GET /api/analytics/heatmap
 * Last 365 calendar days (UTC), one row per day with total + dominant section.
 */
exports.getHeatmap = async (req, res) => {
  try {
    const userId = req.user._id;

    const startDay = new Date();
    startDay.setUTCHours(0, 0, 0, 0);
    startDay.setUTCDate(startDay.getUTCDate() - 364);

    const rangeEnd = new Date(startDay);
    rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 365);

    const sessions = await Session.find({
      userId,
      date: { $gte: startDay, $lt: rangeEnd },
    })
      .select('date section duration')
      .lean();

    const dayMap = new Map();

    for (const s of sessions) {
      const key = utcYmd(new Date(s.date));
      if (!dayMap.has(key)) {
        dayMap.set(key, {
          total: 0,
          bySection: { dsa: 0, dev: 0, semester: 0 },
        });
      }
      const entry = dayMap.get(key);
      const mins = Math.max(0, Number(s.duration) || 0);
      entry.total += mins;
      if (s.section && Object.prototype.hasOwnProperty.call(entry.bySection, s.section)) {
        entry.bySection[s.section] += mins;
      }
    }

    const heatmap = [];
    for (let i = 0; i < 365; i++) {
      const d = new Date(startDay);
      d.setUTCDate(startDay.getUTCDate() + i);
      const dateStr = utcYmd(d);
      const agg = dayMap.get(dateStr) || {
        total: 0,
        bySection: { dsa: 0, dev: 0, semester: 0 },
      };

      let dominantSection = null;
      let max = 0;
      for (const sec of SECTIONS) {
        const v = agg.bySection[sec];
        if (v > max) {
          max = v;
          dominantSection = sec;
        }
      }
      if (max === 0) dominantSection = null;

      heatmap.push({
        date: dateStr,
        totalMinutes: Math.round(agg.total),
        dominantSection,
      });
    }

    res.json(heatmap);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/analytics/streak-dna
 * Last 28 days (UTC); weakDays = weekday names with < 30 total minutes.
 */
exports.getStreakDna = async (req, res) => {
  try {
    const userId = req.user._id;

    const end28 = new Date();
    end28.setUTCHours(23, 59, 59, 999);
    const start28 = new Date(end28);
    start28.setUTCDate(start28.getUTCDate() - 27);
    start28.setUTCHours(0, 0, 0, 0);

    const sessions = await Session.find({
      userId,
      date: { $gte: start28, $lte: end28 },
    })
      .select('date duration')
      .lean();

    const totals = Object.fromEntries(WEEKDAY_MONDAY_FIRST.map((name) => [name, 0]));

    for (const s of sessions) {
      const name = utcWeekdayName(new Date(s.date));
      totals[name] += Math.max(0, Number(s.duration) || 0);
    }

    const weakDays = WEEKDAY_MONDAY_FIRST.filter((d) => totals[d] < 30);

    let suggestion = 'Nice work—you are spreading time across the week.';
    if (weakDays.length > 0) {
      suggestion = `You logged under 30 minutes on ${weakDays.join(
        ', '
      )}. Try one short focused block on those days to even things out.`;
    }

    res.json({ weakDays, suggestion });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/analytics/energy-profile
 * All sessions for user; bucket by startHour (fallback: UTC hour of date).
 */
exports.getEnergyProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const sessions = await Session.find({ userId })
      .select('startHour date quality duration')
      .lean();

    const byHour = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      signalCount: 0,
      totalSessions: 0,
    }));

    for (const s of sessions) {
      let hour = s.startHour;
      if (hour == null || hour < 0 || hour > 23) {
        hour = new Date(s.date).getUTCHours();
      }
      const row = byHour[hour];
      row.totalSessions += 1;
      if (s.quality === 'signal') {
        row.signalCount += 1;
      }
    }

    const result = byHour.map((row) => ({
      hour: row.hour,
      avgSignalRatio:
        row.totalSessions === 0
          ? 0
          : Number((row.signalCount / row.totalSessions).toFixed(4)),
      totalSessions: row.totalSessions,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/analytics/summary
 */
exports.getSummary = async (req, res) => {
  try {
    const userId = req.user._id;

    const sessions = await Session.find({ userId }).select('duration quality').lean();

    let totalMinutes = 0;
    let signalMinutes = 0;

    for (const s of sessions) {
      const d = Math.max(0, Number(s.duration) || 0);
      totalMinutes += d;
      if (s.quality === 'signal') signalMinutes += d;
    }

    const totalSessions = sessions.length;
    const averageSignalPercent =
      totalMinutes === 0 ? 0 : Math.round((signalMinutes / totalMinutes) * 100);

    res.json({
      totalMinutes: Math.round(totalMinutes),
      averageSignalPercent,
      totalSessions,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
