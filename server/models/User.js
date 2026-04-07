const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true,
    unique: true
  },

  password: {
    type: String,
    required: true
  },

  dailyAvailableTime: {
    type: Number,
    default: 180 // minutes (3 hrs default)
  },

  sections: {
    type: [String],
    default: ['dsa', 'dev', 'semester']
  },

  darkHours: {
    start: { type: String, default: "23:00" },
    end: { type: String, default: "07:00" }
  },

  emailReports: {
    type: Boolean,
    default: true
  },

  lastWeekStats: {
    type: Object,
    default: {}
  },

  insightCache: {
    type: Array,
    default: []
  },

  lastInsightGeneratedAt: {
    type: Date
  }

}, {
  timestamps: true // automatically adds createdAt, updatedAt
});



module.exports = mongoose.model('User', userSchema);