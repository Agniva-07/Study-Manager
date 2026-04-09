const Plan = require('../models/Plan');
const { generateRoadmap } = require('../services/aiService');
const { ok, fail } = require('../utils/response');

function safeRoadmapShape(rawRoadmap) {
  const rawWeeks = Array.isArray(rawRoadmap?.weeks) ? rawRoadmap.weeks : [];
  const weeks = rawWeeks.map((week, index) => ({
    week: Number(week?.week) || index + 1,
    title: typeof week?.title === 'string' ? week.title : `Week ${index + 1}`,
    topics: Array.isArray(week?.topics)
      ? week.topics.map((topic) => {
          if (typeof topic === 'string') return { name: topic, difficulty: 'medium' };
          return {
            name: typeof topic?.name === 'string' ? topic.name : 'Topic',
            difficulty: ['easy', 'medium', 'hard'].includes(String(topic?.difficulty).toLowerCase())
              ? String(topic.difficulty).toLowerCase()
              : 'medium',
          };
        })
      : [],
  }));
  return { weeks };
}

exports.generatePlan = async (req, res) => {
  try {
    const { goal, dailyTime, durationWeeks } = req.body;
    console.log('POST /api/plan/generate', {
      userId: req.user?._id?.toString?.() || null,
      goalLen: typeof goal === 'string' ? goal.length : 0,
      dailyTime,
      durationWeeks,
    });

    if (!req.user?._id) {
      return fail(res, 401, 'Not authorized');
    }

    if (!goal || typeof goal !== 'string' || !goal.trim()) {
      return fail(res, 400, 'Goal is required');
    }
    if (!Number.isFinite(Number(dailyTime)) || Number(dailyTime) <= 0) {
      return fail(res, 400, 'Daily time must be a positive number');
    }
    if (!Number.isFinite(Number(durationWeeks)) || Number(durationWeeks) <= 0) {
      return fail(res, 400, 'Duration weeks must be a positive number');
    }

    const rawRoadmap = await generateRoadmap(goal, dailyTime, durationWeeks);
    const roadmap = safeRoadmapShape(rawRoadmap);

    const plan = await Plan.create({
      goal,
      dailyTime,
      durationWeeks,
      roadmap,
      userId: req.user._id,
    });

    return ok(res, plan);
  } catch (error) {
    console.error('generatePlan error:', error);
    return fail(res, 500, error.message || 'Failed to generate plan');
  }
};
