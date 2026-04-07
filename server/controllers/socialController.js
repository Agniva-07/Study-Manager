const mongoose = require('mongoose');
const User = require('../models/User');
const Session = require('../models/Session');

const XP_VALUES = {
  signal: 10,
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
    const users = await User.find({}).select('_id name').lean();
    const sessionAgg = await Session.aggregate([
      {
        $group: {
          _id: '$userId',
          totalBricks: { $sum: 1 },
          totalXP: {
            $sum: {
              $cond: [{ $eq: ['$quality', 'signal'] }, XP_VALUES.signal, XP_VALUES.noise],
            },
          },
          dates: { $push: '$date' },
        },
      },
    ]);

    const statsByUser = new Map();
    for (const user of users) {
      statsByUser.set(String(user._id), {
        userId: String(user._id),
        name: user.name,
        totalXP: 0,
        totalBricks: 0,
        streak: 0,
        dates: [],
      });
    }

    for (const item of sessionAgg) {
      const userKey = String(item._id);
      if (!statsByUser.has(userKey)) continue;
      const row = statsByUser.get(userKey);
      row.totalBricks = item.totalBricks || 0;
      row.totalXP = item.totalXP || 0;
      row.dates = item.dates || [];
    }

    const leaderboard = Array.from(statsByUser.values())
      .map((row) => ({
        userId: row.userId,
        name: row.name,
        totalXP: row.totalXP,
        totalBricks: row.totalBricks,
        streak: calculateStreakFromDates(row.dates),
      }))
      .sort((a, b) => b.totalXP - a.totalXP);

    return res.json(leaderboard);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.getPublicProfile = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const user = await User.findById(id).select('_id name').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    const sessions = await Session.find({ userId: id })
      .select('section quality date')
      .sort({ date: 1, createdAt: 1 })
      .lean();

    let totalXP = 0;
    const sectionStats = { DSA: 0, Dev: 0, Semester: 0 };
    const dates = [];

    for (const session of sessions) {
      totalXP += session.quality === 'signal' ? XP_VALUES.signal : XP_VALUES.noise;
      if (session.section === 'dsa') sectionStats.DSA += 1;
      if (session.section === 'dev') sectionStats.Dev += 1;
      if (session.section === 'semester') sectionStats.Semester += 1;
      dates.push(session.date || session.createdAt);
    }

    return res.json({
      userId: String(user._id),
      name: user.name,
      totalXP,
      totalBricks: sessions.length,
      streak: calculateStreakFromDates(dates),
      sectionStats,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.getWeeklyStats = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - 6);

    const sessions = await Session.find({
      userId: id,
      date: { $gte: startDate },
    })
      .select('date')
      .lean();

    const weekMap = buildWeekMap();
    for (const session of sessions) {
      const key = toYmd(session.date);
      if (!weekMap.has(key)) continue;
      const item = weekMap.get(key);
      item.count += 1;
    }

    return res.json({
      weeklySessions: Array.from(weekMap.values()),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
