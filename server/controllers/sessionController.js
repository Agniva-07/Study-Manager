const Session = require('../models/Session');
const { SECTIONS, QUALITIES } = require('../constants/domain');
const { ok, fail } = require('../utils/response');

const ALLOWED_SECTIONS = new Set(SECTIONS);
const ALLOWED_QUALITIES = new Set(QUALITIES);

function parseSection(section) {
  return String(section || '').trim().toLowerCase();
}

exports.createSession = async (req, res) => {
  try {
    const {
      section,
      duration,
      actualFocusTime,
      quality,
      intention,
      intentionMet,
      startTime: bodyStartTime,
      date,
      awayEvents,
      pomodorosCompleted,
      contextNote,
    } = req.body;

    const normalizedSection = parseSection(section);
    if (!ALLOWED_SECTIONS.has(normalizedSection)) {
      return fail(res, 400, 'Invalid section');
    }

    let derivedHour;
    if (bodyStartTime) derivedHour = new Date(bodyStartTime).getHours();
    else if (date) derivedHour = new Date(date).getHours();
    else derivedHour = new Date().getHours();

    let normalizedQuality;
    if (quality != null && quality !== '') {
      normalizedQuality = String(quality).trim().toLowerCase();
      if (!ALLOWED_QUALITIES.has(normalizedQuality)) {
        return fail(res, 400, 'Invalid quality');
      }
    }

    const session = await Session.create({
      userId: req.user._id,
      section: normalizedSection,
      duration,
      actualFocusTime,
      quality: normalizedQuality,
      intention,
      intentionMet,
      date,
      awayEvents,
      pomodorosCompleted,
      contextNote,
      startHour: derivedHour,
      ...(bodyStartTime ? { startTime: new Date(bodyStartTime) } : {}),
    });

    return ok(res, session, 201);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to create session');
  }
};

exports.updateSession = async (req, res) => {
  try {
    const updates = {};
    const allowedFields = [
      'duration',
      'actualFocusTime',
      'intention',
      'intentionMet',
      'awayEvents',
      'pomodorosCompleted',
      'contextNote',
      'startTime',
      'date',
    ];

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'section')) {
      const normalizedSection = parseSection(req.body.section);
      if (!ALLOWED_SECTIONS.has(normalizedSection)) return fail(res, 400, 'Invalid section');
      updates.section = normalizedSection;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'quality')) {
      const normalizedQuality = String(req.body.quality || '').trim().toLowerCase();
      if (!ALLOWED_QUALITIES.has(normalizedQuality)) return fail(res, 400, 'Invalid quality');
      updates.quality = normalizedQuality;
    }

    const updatedSession = await Session.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedSession) return fail(res, 404, 'Session not found');
    return ok(res, updatedSession);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to update session');
  }
};

exports.getSessionStats = async (req, res) => {
  try {
    const stats = await Session.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: '$section', totalTime: { $sum: '$duration' } } },
    ]);

    const result = { dsa: 0, dev: 0, semester: 0 };
    for (const item of stats) {
      if (Object.prototype.hasOwnProperty.call(result, item._id)) result[item._id] = item.totalTime;
    }

    const insights = SECTIONS.filter((sec) => result[sec] === 0).map(
      (sec) => `You are ignoring ${sec} ⚠️`
    );

    return ok(res, { stats: result, insights });
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to load stats');
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const [agg] = await Session.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: null,
          totalTime: { $sum: '$duration' },
          signalTime: {
            $sum: { $cond: [{ $eq: ['$quality', 'signal'] }, '$duration', 0] },
          },
          dsa: {
            $sum: { $cond: [{ $eq: ['$section', 'dsa'] }, '$duration', 0] },
          },
          dev: {
            $sum: { $cond: [{ $eq: ['$section', 'dev'] }, '$duration', 0] },
          },
          semester: {
            $sum: { $cond: [{ $eq: ['$section', 'semester'] }, '$duration', 0] },
          },
        },
      },
    ]);

    const totalTime = agg?.totalTime || 0;
    const signalRatio = totalTime ? (agg.signalTime || 0) / totalTime : 0;

    return ok(res, {
      totalTime,
      signalRatio: Number(signalRatio.toFixed(2)),
      sectionStats: {
        dsa: agg?.dsa || 0,
        dev: agg?.dev || 0,
        semester: agg?.semester || 0,
      },
    });
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to load dashboard');
  }
};

exports.getDashboardTrends = async (req, res) => {
  try {
    const daily = await Session.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$date',
              timezone: 'UTC',
            },
          },
          total: { $sum: '$duration' },
          signal: {
            $sum: { $cond: [{ $eq: ['$quality', 'signal'] }, '$duration', 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          total: 1,
          signal: 1,
        },
      },
    ]);

    return ok(res, { daily });
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to load trends');
  }
};

exports.getDashboardGravity = async (req, res) => {
  try {
    const sectionAgg = await Session.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: '$section',
          total: { $sum: '$duration' },
          signal: {
            $sum: { $cond: [{ $eq: ['$quality', 'signal'] }, '$duration', 0] },
          },
        },
      },
    ]);

    const data = { dsa: { total: 0, signal: 0 }, dev: { total: 0, signal: 0 }, semester: { total: 0, signal: 0 } };
    for (const row of sectionAgg) {
      if (data[row._id]) data[row._id] = { total: row.total || 0, signal: row.signal || 0 };
    }

    const scores = {};
    for (const sec of SECTIONS) {
      const total = data[sec].total;
      const signal = data[sec].signal;
      const signalRatio = total === 0 ? 0 : signal / total;
      const timeFactor = total === 0 ? 1 : 1 / total;
      const qualityFactor = 1 - signalRatio;
      scores[sec] = Number((timeFactor + qualityFactor).toFixed(2));
    }

    const recommendation = SECTIONS.reduce((best, sec) => (scores[sec] > scores[best] ? sec : best), SECTIONS[0]);
    return ok(res, { recommendation, scores });
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to load gravity');
  }
};
