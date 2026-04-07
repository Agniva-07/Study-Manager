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
    const userId = req.user._id;

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
    return fail(res, 500, error.message || 'Failed to load heatmap');
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

    const weakDays = WEEKDAY_MONDAY_FIRST.filter((d) => totals[d] < 30);

    let suggestion = 'Nice work—you are spreading time across the week.';
    if (weakDays.length > 0) {
      suggestion = `You logged under 30 minutes on ${weakDays.join(
        ', '
      )}. Try one short focused block on those days to even things out.`;
    }

    return ok(res, { weakDays, suggestion });
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to load streak DNA');
  }
};

/**
 * GET /api/analytics/energy-profile
 * All sessions for user; bucket by startHour (fallback: UTC hour of date).
 */
exports.getEnergyProfile = async (req, res) => {
  try {
    const userId = req.user._id;

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
    return fail(res, 500, error.message || 'Failed to load energy profile');
  }
};

/**
 * GET /api/analytics/summary
 */
exports.getSummary = async (req, res) => {
  try {
    const userId = req.user._id;

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
    return fail(res, 500, error.message || 'Failed to load summary');
  }
};
