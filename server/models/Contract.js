const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false
    },
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
    }
});

module.exports = mongoose.model('Contract', contractSchema);