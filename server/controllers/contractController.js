const Contract = require('../models/Contract');
const Session = require('../models/Session');
const { ok, fail } = require('../utils/response');

exports.createContract = async (req, res) => {
  try {
    const { weekStart, goals } = req.body;
    const contract = await Contract.create({
      weekStart,
      goals,
      userId: req.user._id,
    });
    return ok(res, contract, 201);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to create contract');
  }
};

exports.getCurrentContract = async (req, res) => {
  try {
    const contract = await Contract.findOne({ userId: req.user._id }).sort({ weekStart: -1 });
    if (!contract) return fail(res, 404, 'No contract found');
    return ok(res, contract);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to load contract');
  }
};

exports.getContractReview = async (req, res) => {
  try {
    const contract = await Contract.findOne({ userId: req.user._id }).sort({ weekStart: -1 });
    if (!contract) return fail(res, 404, 'No contract found');

    const endOfWeek = new Date(contract.weekStart);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const progressRows = await Session.aggregate([
      {
        $match: {
          userId: req.user._id,
          date: { $gte: contract.weekStart, $lt: endOfWeek },
        },
      },
      { $group: { _id: '$section', total: { $sum: '$duration' } } },
    ]);

    const progress = { dsa: 0, dev: 0, semester: 0 };
    for (const row of progressRows) {
      if (Object.prototype.hasOwnProperty.call(progress, row._id)) progress[row._id] = row.total;
    }

    const result = { goals: contract.goals, progress, status: {}, percentage: {} };
    for (const sec of Object.keys(progress)) {
      const goal = contract.goals[sec] || 0;
      const done = progress[sec];
      result.status[sec] = done >= goal && goal !== 0 ? 'completed' : 'pending';
      result.percentage[sec] = goal === 0 ? 0 : Math.min(100, Math.round((done / goal) * 100));
    }

    return ok(res, result);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to review contract');
  }
};
