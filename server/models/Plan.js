const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
    goal: String,
    dailyTime: Number,
    durationWeeks: Number,
    roadmap: [
        {
            week: Number,
            topic: String,
            sessions: Number
        }
    ],
    createdAt: {
        type: Date,
        default: Date.now
    },
    userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
    },
});

planSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Plan', planSchema);