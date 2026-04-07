const mongoose = require('mongoose');
const Session = require('../models/Session');
const { ok, fail } = require('../utils/response');

const XP_VALUES = {
  signal: 10,
  mixed: 6,
  noise: 3,
};

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toYmd(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function calculateStreakFromDates(sessionDates) {
  if (!sessionDates.length) return 0;
  const uniqueDays = new Set(sessionDates.map((d) => toYmd(d)));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  const cursor = new Date(today);
  while (uniqueDays.has(toYmd(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function buildWeekMap() {
  const map = new Map();
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - i);
    map.set(toYmd(date), {
      day: WEEKDAY_SHORT[date.getDay()],
      count: 0,
    });
  }
  return map;
}

exports.getLeaderboard = async (req, res) => {
  try {
    const sessionAgg = await Session.aggregate([
      {
        $group: {
          _id: '$userId',
          totalBricks: { $sum: 1 },
          totalXP: {
            $sum: {
              $switch: {
                branches: [
                  { case: { $eq: ['$quality', 'signal'] }, then: XP_VALUES.signal },
                  { case: { $eq: ['$quality', 'mixed'] }, then: XP_VALUES.mixed },
                ],
                default: XP_VALUES.noise,
              },
            },
          },
          dates: { $push: '$date' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          name: '$user.name',
          totalXP: 1,
          totalBricks: 1,
          dates: 1,
        },
      },
    ]);

    const leaderboard = sessionAgg
      .map((row) => ({
        userId: String(row.userId),
        name: row.name,
        totalXP: row.totalXP || 0,
        totalBricks: row.totalBricks || 0,
        streak: calculateStreakFromDates(row.dates || []),
      }))
      .sort((a, b) => b.totalXP - a.totalXP);

    return ok(res, leaderboard);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to load leaderboard');
  }
};

exports.getPublicProfile = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return fail(res, 400, 'Invalid user id');
    }

    const [profile] = await Session.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(id) } },
      {
        $group: {
          _id: '$userId',
          totalBricks: { $sum: 1 },
          totalXP: {
            $sum: {
              $switch: {
                branches: [
                  { case: { $eq: ['$quality', 'signal'] }, then: XP_VALUES.signal },
                  { case: { $eq: ['$quality', 'mixed'] }, then: XP_VALUES.mixed },
                ],
                default: XP_VALUES.noise,
              },
            },
          },
          dates: { $push: '$date' },
          dsa: { $sum: { $cond: [{ $eq: ['$section', 'dsa'] }, 1, 0] } },
          dev: { $sum: { $cond: [{ $eq: ['$section', 'dev'] }, 1, 0] } },
          semester: { $sum: { $cond: [{ $eq: ['$section', 'semester'] }, 1, 0] } },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
    ]);
    if (!profile) return fail(res, 404, 'User not found');

    return ok(res, {
      userId: String(profile._id),
      name: profile.user.name,
      totalXP: profile.totalXP || 0,
      totalBricks: profile.totalBricks || 0,
      streak: calculateStreakFromDates(profile.dates || []),
      sectionStats: {
        DSA: profile.dsa || 0,
        Dev: profile.dev || 0,
        Semester: profile.semester || 0,
      },
    });
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to load profile');
  }
};

exports.getWeeklyStats = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return fail(res, 400, 'Invalid user id');
    }

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - 6);

    const sessions = await Session.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(id),
          date: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$date',
              timezone: 'UTC',
            },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const weekMap = buildWeekMap();
    for (const session of sessions) {
      const key = session._id;
      if (!weekMap.has(key)) continue;
      const item = weekMap.get(key);
      item.count += session.count || 0;
    }

    return ok(res, {
      weeklySessions: Array.from(weekMap.values()),
    });
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to load weekly stats');
  }
};
