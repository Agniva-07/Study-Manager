import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PageTransition, { cardVariants } from '../components/PageTransition';
import { generatePlan } from '../api';

const WEEK_COLORS = [
  '#a855f7', '#00d4ff', '#10b981', '#f59e0b', '#ec4899', '#ef4444',
  '#8b5cf6', '#06b6d4', '#14b8a6', '#fb923c',
];

const DIFFICULTY_STYLES = {
  easy: { bg: 'rgba(16,185,129,0.12)', color: '#10b981', border: 'rgba(16,185,129,0.3)' },
  medium: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
  hard: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', border: 'rgba(239,68,68,0.3)' },
};

/* ── Shimmer skeleton loader ────────────────── */
function ShimmerLoader() {
  return (
    <div className="max-w-2xl mx-auto mt-12">
      <motion.div
        className="flex flex-col items-center gap-3 mb-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="w-10 h-10 rounded-full"
          style={{ border: '3px solid rgba(168,85,247,0.2)', borderTopColor: '#a855f7' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        <motion.p
          className="text-sm font-medium"
          style={{ color: '#8888aa' }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          ✨ AI is crafting your personalized roadmap...
        </motion.p>
      </motion.div>

      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-start mb-8">
          <div className="relative flex flex-col items-center mr-6">
            <motion.div
              className="w-4 h-4 rounded-full"
              style={{ background: 'rgba(168,85,247,0.2)' }}
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
            />
            {i < 4 && <div className="w-px h-16 mt-1" style={{ background: 'rgba(168,85,247,0.08)' }} />}
          </div>
          <motion.div
            className="flex-1 rounded-2xl p-5"
            style={{ background: 'rgba(15,15,35,0.4)', border: '1px solid rgba(255,255,255,0.04)' }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.15 }}
          >
            <div className="h-3 w-20 rounded-full mb-3" style={{ background: 'rgba(168,85,247,0.1)' }} />
            <div className="h-4 w-48 rounded-full mb-3" style={{ background: 'rgba(255,255,255,0.04)' }} />
            <div className="flex gap-2">
              <div className="h-3 w-24 rounded-full" style={{ background: 'rgba(255,255,255,0.03)' }} />
              <div className="h-3 w-32 rounded-full" style={{ background: 'rgba(255,255,255,0.03)' }} />
            </div>
          </motion.div>
        </div>
      ))}
    </div>
  );
}

export default function Roadmap() {
  const [goal, setGoal] = useState('');
  const [dailyTime, setDailyTime] = useState('');
  const [weeks, setWeeks] = useState('');
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = goal.trim() && dailyTime && weeks && !loading;

  const normalizeRoadmap = (payload) => {
    const rawWeeks = Array.isArray(payload?.weeks) ? payload.weeks : [];
    return {
      weeks: rawWeeks.map((week, index) => ({
        week: Number(week?.week) || index + 1,
        title: typeof week?.title === 'string' ? week.title : `Week ${index + 1}`,
        topics: Array.isArray(week?.topics)
          ? week.topics.map((topic) => {
              if (typeof topic === 'string') {
                return { name: topic, difficulty: 'medium' };
              }
              return {
                name: typeof topic?.name === 'string' ? topic.name : 'Topic',
                difficulty: ['easy', 'medium', 'hard'].includes(String(topic?.difficulty).toLowerCase())
                  ? String(topic.difficulty).toLowerCase()
                  : 'medium',
              };
            })
          : [],
      })),
    };
  };

  const handleGenerate = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    setRoadmap(null);

    try {
      const res = await generatePlan({
        goal: goal.trim(),
        dailyTime: parseInt(dailyTime),
        durationWeeks: parseInt(weeks),
      });

      const data = res.data.roadmap || res.data; // Handle both { roadmap: {...} } and direct {...} responses

      // Handle backend error response
      if (data.error) {
        setError(data.error);
        return;
      }

      // Validate response structure
      if (!data.weeks || !Array.isArray(data.weeks)) {
        setError('Unexpected response from AI. Please try again.');
        return;
      }

      setRoadmap(normalizeRoadmap(data));
    } catch (err) {
      console.error('Roadmap generation failed:', err);
      setError(
        err.message ||
        err.response?.data?.error ||
        'Failed to generate roadmap. Make sure the backend server is running.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setRoadmap(null);
    setError('');
  };

  return (
    <PageTransition>
      <div className="page-container">
        {/* ── Header ── */}
        <motion.div variants={cardVariants} className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4"
            style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
            </svg>
            <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#a855f7' }}>
              AI Powered
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: '#f0f0ff' }}>
            Roadmap Generator
          </h1>
          <p className="text-sm max-w-md mx-auto" style={{ color: '#555577' }}>
            Tell us your goal and let AI create a week-by-week study plan personalized for you.
          </p>
        </motion.div>

        {/* ── Input Form ── */}
        <motion.div variants={cardVariants} className="glass-card-glow p-8 max-w-xl mx-auto mb-12">
          <div className="flex flex-col gap-5">
            {/* Goal */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest mb-2 block"
                style={{ color: '#8888aa' }}>
                🎯 Your Goal
              </label>
              <input
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g., Master DSA for FAANG interviews"
                className="input-glass"
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              />
            </div>

            {/* Daily Time + Weeks */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-2 block"
                  style={{ color: '#8888aa' }}>
                  ⏱ Daily Minutes
                </label>
                <input
                  type="number"
                  value={dailyTime}
                  onChange={(e) => setDailyTime(e.target.value)}
                  placeholder="90"
                  className="input-glass"
                  min="1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-2 block"
                  style={{ color: '#8888aa' }}>
                  📅 Duration (Weeks)
                </label>
                <input
                  type="number"
                  value={weeks}
                  onChange={(e) => setWeeks(e.target.value)}
                  placeholder="6"
                  className="input-glass"
                  min="1"
                  max="12"
                />
              </div>
            </div>

            {/* Generate Button */}
            <motion.button
              onClick={handleGenerate}
              className="btn-primary w-full py-4 text-base"
              disabled={!canSubmit}
              style={{
                opacity: canSubmit ? 1 : 0.4,
                cursor: canSubmit ? 'pointer' : 'not-allowed',
              }}
              whileHover={canSubmit ? { scale: 1.02 } : {}}
              whileTap={canSubmit ? { scale: 0.98 } : {}}
            >
              {loading ? '⚙️ Generating...' : '✨ Generate Roadmap'}
            </motion.button>
          </div>
        </motion.div>

        {/* ── Error State ── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-xl mx-auto mb-8 p-4 rounded-xl text-center"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
              }}
            >
              <p className="text-sm" style={{ color: '#ef4444' }}>⚠️ {error}</p>
              <button
                onClick={handleReset}
                className="text-xs mt-2 underline cursor-pointer"
                style={{ color: '#8888aa' }}
              >
                Try again
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Loading Shimmer ── */}
        {loading && <ShimmerLoader />}

        {/* ── Roadmap Timeline ── */}
        <AnimatePresence>
          {roadmap?.weeks && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* Goal banner */}
              <div className="text-center mb-10">
                <motion.span
                  className="inline-block px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-widest"
                  style={{
                    background: 'rgba(168,85,247,0.12)',
                    color: '#a855f7',
                    border: '1px solid rgba(168,85,247,0.25)',
                  }}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  🎯 {goal}
                </motion.span>
                <motion.p
                  className="text-xs mt-3"
                  style={{ color: '#555577' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  {roadmap.weeks.length} weeks · {dailyTime} min/day
                </motion.p>
              </div>

              {/* Timeline */}
              <div className="relative max-w-2xl mx-auto">
                {/* Vertical glowing line */}
                <motion.div
                  className="absolute left-[23px] md:left-1/2 md:-translate-x-px top-0 w-[2px]"
                  style={{
                    background: 'linear-gradient(180deg, #a855f7, #00d4ff, #10b981, transparent)',
                  }}
                  initial={{ height: 0 }}
                  animate={{ height: '100%' }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                />

                {roadmap.weeks.map((week, i) => {
                  const color = WEEK_COLORS[i % WEEK_COLORS.length];
                  const isLeft = i % 2 === 0;

                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: isLeft ? -50 : 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 + i * 0.15 }}
                      className={`relative flex items-start mb-10 ${
                        isLeft ? 'md:flex-row' : 'md:flex-row-reverse'
                      } flex-row`}
                    >
                      {/* ── Glowing node ── */}
                      <div className="absolute left-[23px] md:left-1/2 -translate-x-1/2 z-10">
                        <motion.div
                          className="w-5 h-5 rounded-full flex items-center justify-center"
                          style={{
                            background: color,
                            boxShadow: `0 0 16px ${color}60, 0 0 32px ${color}20`,
                          }}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.4 + i * 0.15, type: 'spring', stiffness: 300, damping: 15 }}
                        >
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ background: 'rgba(255,255,255,0.6)' }}
                          />
                        </motion.div>
                      </div>

                      {/* ── Week Card ── */}
                      <div
                        className={`ml-14 md:ml-0 ${
                          isLeft
                            ? 'md:mr-[calc(50%+2.5rem)] md:text-right'
                            : 'md:ml-[calc(50%+2.5rem)]'
                        } flex-1`}
                      >
                        <motion.div
                          className="glass-card p-6 group relative overflow-hidden"
                          whileHover={{
                            y: -3,
                            boxShadow: `0 0 30px ${color}15, 0 0 60px ${color}06`,
                          }}
                          transition={{ duration: 0.25 }}
                        >
                          {/* Ambient card glow */}
                          <div
                            className="absolute -top-10 -right-10 w-28 h-28 rounded-full opacity-0 group-hover:opacity-30 transition-opacity duration-500"
                            style={{ background: `radial-gradient(circle, ${color}40, transparent 70%)` }}
                          />

                          {/* Week badge */}
                          <div className={`flex items-center gap-3 mb-3 ${isLeft ? 'md:justify-end' : 'justify-start'}`}>
                            <span
                              className="text-[10px] px-2.5 py-1 rounded-full font-bold tracking-wider uppercase"
                              style={{
                                background: `${color}18`,
                                color,
                                border: `1px solid ${color}35`,
                              }}
                            >
                              Week {week.week}
                            </span>
                          </div>

                          {/* Week title */}
                          {week.title && (
                            <h3
                              className="text-base font-bold mb-3 relative z-10"
                              style={{ color: '#f0f0ff' }}
                            >
                              {week.title}
                            </h3>
                          )}

                          {/* Topics list */}
                          {week.topics && week.topics.length > 0 && (
                            <ul className={`flex flex-col gap-2 relative z-10 ${isLeft ? 'md:items-end' : 'items-start'}`}>
                              {week.topics.map((topic, j) => {
                                const topicName = typeof topic === 'string' ? topic : topic.name;
                                const difficulty = typeof topic === 'object' ? topic.difficulty : null;
                                const diffStyle = difficulty
                                  ? DIFFICULTY_STYLES[difficulty.toLowerCase()] || DIFFICULTY_STYLES.medium
                                  : null;

                                return (
                                  <motion.li
                                    key={j}
                                    className="flex items-center gap-2"
                                    initial={{ opacity: 0, x: isLeft ? 10 : -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.5 + i * 0.15 + j * 0.06 }}
                                  >
                                    <span
                                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                      style={{ background: color }}
                                    />
                                    <span className="text-sm" style={{ color: '#c0c0dd' }}>
                                      {topicName}
                                    </span>
                                    {diffStyle && (
                                      <span
                                        className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider"
                                        style={{
                                          background: diffStyle.bg,
                                          color: diffStyle.color,
                                          border: `1px solid ${diffStyle.border}`,
                                        }}
                                      >
                                        {difficulty}
                                      </span>
                                    )}
                                  </motion.li>
                                );
                              })}
                            </ul>
                          )}
                        </motion.div>
                      </div>
                    </motion.div>
                  );
                })}

                {/* ── Finish node ── */}
                <motion.div
                  className="absolute left-[23px] md:left-1/2 -translate-x-1/2 bottom-0 z-10"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 + roadmap.weeks.length * 0.15, type: 'spring' }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{
                      background: 'rgba(16,185,129,0.15)',
                      border: '2px solid #10b981',
                      boxShadow: '0 0 20px rgba(16,185,129,0.3)',
                    }}
                  >
                    <span className="text-sm">🏁</span>
                  </div>
                </motion.div>
              </div>

              {/* ── Regenerate button ── */}
              <motion.div
                className="text-center mt-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                <button
                  onClick={handleReset}
                  className="px-6 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer transition-all duration-300"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#8888aa',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = 'rgba(168,85,247,0.3)';
                    e.target.style.color = '#a855f7';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                    e.target.style.color = '#8888aa';
                  }}
                >
                  🔄 Generate Another
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Empty state (no roadmap and not loading) ── */}
        {!roadmap && !loading && !error && (
          <motion.div
            className="text-center mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-xs" style={{ color: '#333355' }}>
              Fill in the form above and let AI build your study path ↑
            </p>
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
}
