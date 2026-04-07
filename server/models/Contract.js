const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema({
    weekStart: {
        type: Date,
        required: true
    },
    goals: {
        dsa: { type: Number, default: 0 },
        dev: { type: Number, default: 0 },
        semester: { type: Number, default: 0 }
    },
    reviewCompleted: {
        type: Boolean,
        default: false
    },
    userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
    },
});

contractSchema.index({ userId: 1, weekStart: -1 });

module.exports = mongoose.model('Contract', contractSchema);