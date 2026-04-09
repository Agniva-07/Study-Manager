const Session = require('../models/Session');
const { ok, fail } = require('../utils/response');

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

/**
 * GET /api/analytics/heatmap
 * Last 365 calendar days (UTC), one row per day with total + dominant section.
 */
exports.getHeatmap = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return ok(res, []);

    const startDay = new Date();
    startDay.setUTCHours(0, 0, 0, 0);
    startDay.setUTCDate(startDay.getUTCDate() - 364);

    const rangeEnd = new Date(startDay);
    rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 365);

    const sessions = await Session.aggregate([
      {
        $match: {
          userId,
          date: { $gte: startDay, $lt: rangeEnd },
        },
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$date',
                timezone: 'UTC',
              },
            },
            section: '$section',
          },
          total: { $sum: '$duration' },
        },
      },
    ]);

    const dayMap = new Map();

    for (const s of sessions) {
      const key = s._id.date;
      if (!dayMap.has(key)) {
        dayMap.set(key, {
          total: 0,
          bySection: { dsa: 0, dev: 0, semester: 0 },
        });
      }
      const entry = dayMap.get(key);
      const mins = Math.max(0, Number(s.total) || 0);
      entry.total += mins;
      const section = s._id.section;
      if (section && Object.prototype.hasOwnProperty.call(entry.bySection, section)) {
        entry.bySection[section] += mins;
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

    return ok(res, heatmap);
  } catch (error) {
    console.error('Analytics.getHeatmap error:', error);
    return ok(res, []);
  }
};

/**
 * GET /api/analytics/streak-dna
 * Last 28 days (UTC); weakDays computed relative to user's own average.
 */
exports.getStreakDna = async (req, res) => {
  try {
    const userId = req.user?._id;
    console.log('GET /api/analytics/streak-dna', { userId: userId?.toString?.() || null });
    if (!userId) {
      return ok(res, { weakDays: [], suggestion: 'Log in to see your streak insights.' });
    }

    const end28 = new Date();
    end28.setUTCHours(23, 59, 59, 999);
    const start28 = new Date(end28);
    start28.setUTCDate(start28.getUTCDate() - 27);
    start28.setUTCHours(0, 0, 0, 0);

    const sessions = await Session.aggregate([
      {
        $match: {
          userId,
          date: { $gte: start28, $lte: end28 },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%A',
              date: '$date',
              timezone: 'UTC',
            },
          },
          total: { $sum: '$duration' },
        },
      },
    ]);

    const totals = Object.fromEntries(WEEKDAY_MONDAY_FIRST.map((name) => [name, 0]));

    for (const s of sessions) {
      const name = s._id;
      if (totals[name] == null) continue;
      totals[name] += Math.max(0, Number(s.total) || 0);
    }

    const totalMinutesAll = WEEKDAY_MONDAY_FIRST.reduce((sum, d) => sum + (totals[d] || 0), 0);
    if (totalMinutesAll <= 0) {
      return ok(res, {
        weakDays: [],
        suggestion: 'Not enough data yet. Log a few sessions over different days to unlock insights.',
      });
    }

    // Average over all 7 weekdays (zeros included) to reflect consistency
    const avg = totalMinutesAll / 7;
    const threshold = avg * 0.6;

    const weekdayRows = WEEKDAY_MONDAY_FIRST.map((full) => ({
      full,
      short: full.slice(0, 3),
      minutes: totals[full] || 0,
    }));

    const min = Math.min(...weekdayRows.map((r) => r.minutes));
    const max = Math.max(...weekdayRows.map((r) => r.minutes));
    const variationExists = max > min;

    let weak = weekdayRows.filter((r) => r.minutes < threshold);

    // Ensure meaningful output when variation exists: pick 1–2 lowest days even if threshold misses.
    if (weak.length === 0 && variationExists) {
      const sorted = [...weekdayRows].sort((a, b) => a.minutes - b.minutes);
      const first = sorted[0];
      const second = sorted[1];
      weak = [first];

      // Add second weak day if it is also notably below average, or far below the max.
      if (
        second &&
        (second.minutes < avg * 0.85 || (max > 0 && second.minutes / max < 0.55))
      ) {
        weak.push(second);
      }
    }

    // If everything is equal (or close enough), return no weak days.
    if (!variationExists) {
      return ok(res, {
        weakDays: [],
        suggestion: 'Your week looks perfectly balanced. Keep this steady rhythm going.',
      });
    }

    const weakDays = weak
      .sort((a, b) => a.minutes - b.minutes)
      .map((r) => r.short);

    const weakList = weakDays.join(' and ');
    const suggestion =
      weakDays.length > 0
        ? `Your consistency drops on ${weakList}. Try scheduling lighter sessions on those days instead of skipping.`
        : 'Nice work—your consistency is strong across the whole week.';

    return ok(res, { weakDays, suggestion });
  } catch (error) {
    console.error('Analytics.getStreakDna error:', error);
    return ok(res, {
      weakDays: [],
      suggestion: 'Could not load streak insights yet. Try again in a moment.',
    });
  }
};

/**
 * GET /api/analytics/energy-profile
 * All sessions for user; bucket by startHour (fallback: UTC hour of date).
 */
exports.getEnergyProfile = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return ok(res, []);

    const sessions = await Session.aggregate([
      { $match: { userId } },
      {
        $project: {
          hour: {
            $cond: [
              { $and: [{ $gte: ['$startHour', 0] }, { $lte: ['$startHour', 23] }] },
              '$startHour',
              { $hour: '$date' },
            ],
          },
          quality: 1,
        },
      },
      {
        $group: {
          _id: '$hour',
          signalCount: {
            $sum: { $cond: [{ $eq: ['$quality', 'signal'] }, 1, 0] },
          },
          totalSessions: { $sum: 1 },
        },
      },
    ]);

    const byHour = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      signalCount: 0,
      totalSessions: 0,
    }));

    for (const s of sessions) {
      const hour = Number(s._id);
      if (hour < 0 || hour > 23) continue;
      byHour[hour].totalSessions = s.totalSessions || 0;
      byHour[hour].signalCount = s.signalCount || 0;
    }

    const result = byHour.map((row) => ({
      hour: row.hour,
      avgSignalRatio:
        row.totalSessions === 0
          ? 0
          : Number((row.signalCount / row.totalSessions).toFixed(4)),
      totalSessions: row.totalSessions,
    }));

    return ok(res, result);
  } catch (error) {
    console.error('Analytics.getEnergyProfile error:', error);
    return ok(res, []);
  }
};

/**
 * GET /api/analytics/summary
 */
exports.getSummary = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return ok(res, {
        totalMinutes: 0,
        averageSignalPercent: 0,
        totalSessions: 0,
      });
    }

    const [summary] = await Session.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalMinutes: { $sum: '$duration' },
          signalMinutes: {
            $sum: { $cond: [{ $eq: ['$quality', 'signal'] }, '$duration', 0] },
          },
          totalSessions: { $sum: 1 },
        },
      },
    ]);

    const totalMinutes = Math.round(summary?.totalMinutes || 0);
    const signalMinutes = summary?.signalMinutes || 0;
    const totalSessions = summary?.totalSessions || 0;
    const averageSignalPercent =
      totalMinutes === 0 ? 0 : Math.round((signalMinutes / totalMinutes) * 100);

    return ok(res, {
      totalMinutes,
      averageSignalPercent,
      totalSessions,
    });
  } catch (error) {
    console.error('Analytics.getSummary error:', error);
    return ok(res, {
      totalMinutes: 0,
      averageSignalPercent: 0,
      totalSessions: 0,
    });
  }
};
