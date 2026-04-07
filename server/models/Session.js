const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    section: {
      type: String,
      enum: ['dsa', 'dev', 'semester'],
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    actualFocusTime: {
      type: Number,
      default: 0,
    },
    quality: {
      type: String,
    },
    intention: {
      type: String,
    },
    intentionMet: {
      type: String,
    },
    /** When the user started the session; used to derive startHour */
    startTime: {
      type: Date,
    },
    /** Hour (0–23) derived from startTime (or date) on create */
    startHour: {
      type: Number,
      min: 0,
      max: 23,
    },
    awayEvents: {
      type: Number,
      default: 0,
    },
    pomodorosCompleted: {
      type: Number,
      default: 0,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    contextNote: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Session', sessionSchema);
