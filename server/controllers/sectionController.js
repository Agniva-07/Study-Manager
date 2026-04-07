const Session = require('../models/Session');
const { SECTIONS } = require('../constants/domain');
const { ok, fail } = require('../utils/response');

const FLOOR_SIZE = 10;
const XP_VALUES = {
  signal: 10,
  mixed: 6,
  noise: 3,
};
const XP_PER_LEVEL = 100;
const DEFAULT_DAILY_GOAL = 3;

function normalizeSection(sectionName = '') {
  return String(sectionName).trim().toLowerCase();
}

function escapeRegex(input = '') {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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

exports.getBuilderStats = async (req, res) => {
  try {
    const normalizedSection = normalizeSection(req.params.sectionName);

    if (!SECTIONS.includes(normalizedSection)) {
      return fail(res, 400, 'Invalid sectionName');
    }

    const sectionPattern = new RegExp(`^${escapeRegex(normalizedSection)}$`, 'i');
    const scopedUserFilter = { $or: [{ userId: req.user._id }, { user: req.user._id }] };

    const rawSessions = await Session.find({
      $and: [
        // Keep strict user scoping while supporting legacy field naming.
        scopedUserFilter,
        { section: { $regex: sectionPattern } },
      ],
    })
      .sort({ date: 1, createdAt: 1 })
      .select('_id date createdAt duration quality')
      .lean();

    // Used for global streak/goal/achievements (all sections for this user).
    const allUserSessions = await Session.find(scopedUserFilter)
      .select('date createdAt')
      .sort({ date: 1, createdAt: 1 })
      .lean();

    const totalBricks = rawSessions.length;
    const signalBricks = rawSessions.filter((s) => s.quality === 'signal').length;
    const noiseBricks = rawSessions.filter((s) => s.quality === 'noise').length;

    const floors = [];
    const totalFloors = Math.ceil(totalBricks / FLOOR_SIZE);
    for (let i = 0; i < totalFloors; i += 1) {
      const start = i * FLOOR_SIZE;
      const end = start + FLOOR_SIZE;
      const bricks = rawSessions.slice(start, end).length;
      floors.push({
        floorNumber: i + 1,
        bricks,
        completed: bricks === FLOOR_SIZE,
      });
    }

    const sessions = rawSessions.map((s) => ({
      _id: s._id,
      date: s.date || s.createdAt,
      duration: Number(s.duration) || 0,
      quality: s.quality === 'signal' || s.quality === 'mixed' || s.quality === 'noise'
        ? s.quality
        : 'noise',
      xp: s.quality === 'signal'
        ? XP_VALUES.signal
        : s.quality === 'mixed'
          ? XP_VALUES.mixed
          : XP_VALUES.noise,
    }));

    const totalXP = sessions.reduce((sum, s) => sum + s.xp, 0);
    const level = Math.floor(totalXP / XP_PER_LEVEL) + 1;
    const levelProgressPercent = Math.floor(((totalXP % XP_PER_LEVEL) / XP_PER_LEVEL) * 100);
    const allSessionDates = allUserSessions.map((s) => s.date || s.createdAt);
    const streak = calculateStreakFromDates(allSessionDates);

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const todaySessions = allSessionDates.filter((d) => {
      const at = new Date(d);
      return at >= todayStart && at < tomorrowStart;
    }).length;

    const dailyGoal = DEFAULT_DAILY_GOAL;
    const goalCompleted = todaySessions >= dailyGoal;

    const totalUserSessions = allUserSessions.length;
    const achievements = [
      { title: 'First Brick 🧱', unlocked: totalUserSessions >= 1 },
      { title: 'Getting Started 🔥', unlocked: totalUserSessions >= 10 },
      { title: 'Focused Mind 🧠', unlocked: totalUserSessions >= 50 },
    ];

    return ok(res, {
      sectionName: normalizedSection,
      totalBricks,
      signalBricks,
      noiseBricks,
      floors,
      sessions,
      totalXP,
      level,
      streak,
      levelProgressPercent,
      dailyGoal,
      todaySessions,
      goalCompleted,
      achievements,
    });
  } catch (err) {
    return fail(res, 500, 'Server error');
  }
};