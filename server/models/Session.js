const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false // for now (no auth yet)
    },
    section: {
        type: String, // dsa / dev / semester
        required: true
    },
    duration: {
        type: Number, // planned minutes
        required: true
    },
    actualFocusTime: {
        type: Number,
        default: 0
    },
    quality: {
        type: String, // "signal" or "noise"
    },
    intention: {
        type: String
    },
    intentionMet: {
        type: String // yes / partially / no
    },
    startHour: {
        type: Number
    },
    awayEvents: {
        type: Number,
        default: 0
    },
    date: {
        type: Date,
        default: Date.now
    },
    contextNote: {
    type: String,
    default: ""
    },
    section: {
    type: String,
    enum: ["dsa", "dev", "semester"]
    }
});

module.exports = mongoose.model('Session', sessionSchema);