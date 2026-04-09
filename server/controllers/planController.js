const Plan = require('../models/Plan');
const { generateRoadmap } = require('../services/aiService');
const { ok, fail } = require('../utils/response');

function safeRoadmapShape(rawRoadmap) {
  const rawWeeks = Array.isArray(rawRoadmap?.weeks) ? rawRoadmap.weeks : [];

  const weeks = rawWeeks.map((week, index) => ({
    week: Number(week?.week) || index + 1,

    title:
      typeof week?.title === 'string' && week.title.trim()
        ? week.title
        : `Week ${index + 1}`,

    topics: Array.isArray(week?.topics)
      ? week.topics
          .map((topic) => {
            if (typeof topic === 'string') {
              return { name: topic, difficulty: 'medium' };
            }

            return {
              name:
                typeof topic?.name === 'string' && topic.name.trim()
                  ? topic.name
                  : null, // ⚠️ mark invalid

              difficulty: ['easy', 'medium', 'hard'].includes(
                String(topic?.difficulty).toLowerCase()
              )
                ? String(topic.difficulty).toLowerCase()
                : 'medium',
            };
          })
          .filter((t) => t.name) // 🔥 remove invalid topics
      : [],
  }))
  .filter((w) => w.topics.length > 0); // 🔥 remove empty weeks

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

    // Set a timeout for the entire operation (45 seconds)
    // Gemini will retry for up to ~30 seconds, then fallback
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout: AI service took too long')), 45000)
    );

    const roadmapPromise = generateRoadmap(goal, Number(dailyTime), Number(durationWeeks));

    // Race between roadmap generation and timeout
    const rawRoadmap = await Promise.race([roadmapPromise, timeoutPromise]);
    const roadmap = safeRoadmapShape(rawRoadmap);

    // Validate that we got at least one week
    if (!roadmap.weeks || roadmap.weeks.length === 0) {
      return fail(res, 500, 'Failed to generate valid roadmap. Please try again.');
    }

    const plan = await Plan.create({
      goal,
      dailyTime: Number(dailyTime),
      durationWeeks: Number(durationWeeks),
      roadmap,
      userId: req.user._id,
    });

    console.log('✅ FINAL ROADMAP RESPONSE:', {
      weekCount: plan.roadmap.weeks.length,
      totalTopics: plan.roadmap.weeks.reduce((sum, w) => sum + w.topics.length, 0),
    });

    return ok(res, {
      weeks: Array.isArray(plan?.roadmap?.weeks) ? plan.roadmap.weeks : [],
    });

  } catch (error) {
    console.error('❌ generatePlan error:', {
      message: error.message,
      stack: error.stack?.substring(0, 200),
    });

    // Distinguish between timeout and other errors
    if (error.message.includes('timeout')) {
      return fail(res, 504, 'Request timeout - AI service is experiencing delays. Your fallback plan has been queued.');
    }

    return fail(res, 500, error.message || 'Failed to generate plan');
  }
};