import { useState, useEffect, useRef, useCallback } from 'react';
import { motion ,AnimatePresence } from 'framer-motion';
import PageTransition, { cardVariants } from '../components/PageTransition';
import { createSession, updateSession } from '../api';

const SECTIONS = [
  { key: 'dsa', label: 'DSA', color: '#a855f7', emoji: '🧠' },
  { key: 'dev', label: 'Development', color: '#00d4ff', emoji: '💻' },
  { key: 'semester', label: 'Semester', color: '#10b981', emoji: '📚' },
];

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function Session() {
  const [phase, setPhase] = useState('setup'); // setup | running | review | done
  const [section, setSection] = useState('');
  const [intention, setIntention] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [quality, setQuality] = useState('');
  const [contextNote, setContextNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  const handleStart = async () => {
    if (!section || !intention.trim()) return;
    try {
      const res = await createSession({
        section,
        intention,
        duration: 0,
        startHour: new Date().getHours(),
      });
      setSessionId(res.data._id);
      setPhase('running');
      startTimer();
    } catch (err) {
      console.error('Start session error:', err);
    }
  };

  const handleEnd = () => {
    stopTimer();
    setPhase('review');
  };

  const handleSubmitReview = async () => {
    if (!quality) return;
    setSubmitting(true);
    try {
      await updateSession(sessionId, {
        duration: Math.ceil(elapsed / 60),
        actualFocusTime: Math.ceil(elapsed / 60),
        quality,
        contextNote,
      });
      setPhase('done');
    } catch (err) {
      console.error('End session error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const resetSession = () => {
    setPhase('setup');
    setSection('');
    setIntention('');
    setElapsed(0);
    setSessionId(null);
    setQuality('');
    setContextNote('');
  };

  // Calculate % around a full circle for the visual ring
  const ringProgress = Math.min((elapsed / 3600) * 100, 100);
  const circumference = 2 * Math.PI * 120;
  const dashOffset = circumference - (ringProgress / 100) * circumference;

  return (
    <PageTransition>
      <div className="page-container flex flex-col items-center justify-center min-h-[80vh]">
        <AnimatePresence mode="wait">
          {/* ─── SETUP ─── */}
          {phase === 'setup' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="w-full max-w-md"
            >
              <motion.div variants={cardVariants} className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: '#f0f0ff' }}>
                  Enter the Flow
                </h1>
                <p className="text-sm" style={{ color: '#555577' }}>
                  Set your intention. Lock in. Begin.
                </p>
              </motion.div>

              <motion.div variants={cardVariants} className="glass-card-glow p-8 flex flex-col gap-6">
                {/* Section Select */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest mb-3 block" style={{ color: '#8888aa' }}>
                    Section
                  </label>
                  <div className="flex gap-3">
                    {SECTIONS.map((s) => (
                      <button
                        key={s.key}
                        onClick={() => setSection(s.key)}
                        className="flex-1 py-3 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer"
                        style={{
                          background: section === s.key ? `${s.color}20` : 'rgba(15, 15, 35, 0.6)',
                          border: `1px solid ${section === s.key ? `${s.color}60` : 'rgba(255,255,255,0.06)'}`,
                          color: section === s.key ? s.color : '#555577',
                        }}
                      >
                        <span className="block text-lg mb-0.5">{s.emoji}</span>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Intention */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest mb-3 block" style={{ color: '#8888aa' }}>
                    Intention
                  </label>
                  <input
                    type="text"
                    value={intention}
                    onChange={(e) => setIntention(e.target.value)}
                    placeholder="What will you focus on?"
                    className="input-glass"
                    onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                  />
                </div>

                {/* Start Button */}
                <motion.button
                  onClick={handleStart}
                  className="btn-primary w-full py-4 text-base"
                  disabled={!section || !intention.trim()}
                  style={{
                    opacity: !section || !intention.trim() ? 0.4 : 1,
                    cursor: !section || !intention.trim() ? 'not-allowed' : 'pointer',
                  }}
                  whileHover={section && intention.trim() ? { scale: 1.02 } : {}}
                  whileTap={section && intention.trim() ? { scale: 0.98 } : {}}
                >
                  🚀 Start Session
                </motion.button>
              </motion.div>
            </motion.div>
          )}

          {/* ─── RUNNING ─── */}
          {phase === 'running' && (
            <motion.div
              key="running"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-8"
            >
              {/* Section chip */}
              <motion.div
                className="px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest"
                style={{
                  background: `${SECTIONS.find(s => s.key === section)?.color}15`,
                  color: SECTIONS.find(s => s.key === section)?.color,
                  border: `1px solid ${SECTIONS.find(s => s.key === section)?.color}30`,
                }}
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                {SECTIONS.find(s => s.key === section)?.emoji} {section}
              </motion.div>

              {/* Timer Ring */}
              <div className="relative">
                <svg width="280" height="280" viewBox="0 0 280 280">
                  {/* Track */}
                  <circle cx="140" cy="140" r="120" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="4" />
                  {/* Progress */}
                  <motion.circle
                    cx="140" cy="140" r="120"
                    fill="none"
                    stroke="url(#timerGrad)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    transform="rotate(-90 140 140)"
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: dashOffset }}
                    transition={{ duration: 0.5, ease: 'linear' }}
                  />
                  <defs>
                    <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#00d4ff" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.span
                    className="text-5xl md:text-6xl font-bold tracking-tight"
                    style={{ fontFamily: "'JetBrains Mono'", color: '#f0f0ff' }}
                    key={elapsed}
                  >
                    {formatTime(elapsed)}
                  </motion.span>
                  <span className="text-xs mt-2 uppercase tracking-widest" style={{ color: '#555577' }}>
                    Elapsed
                  </span>
                </div>
              </div>

              {/* Intention display */}
              <p className="text-sm text-center max-w-xs" style={{ color: '#8888aa' }}>
                "{intention}"
              </p>

              {/* End button */}
              <motion.button
                onClick={handleEnd}
                className="px-8 py-3 rounded-xl font-semibold text-sm cursor-pointer"
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                }}
                whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(239, 68, 68, 0.2)' }}
                whileTap={{ scale: 0.95 }}
              >
                ■ End Session
              </motion.button>
            </motion.div>
          )}

          {/* ─── REVIEW ─── */}
          {phase === 'review' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="w-full max-w-md"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-1" style={{ color: '#f0f0ff' }}>
                  Session Complete
                </h2>
                <p className="text-sm" style={{ color: '#555577' }}>
                  {formatTime(elapsed)} of deep work
                </p>
              </div>

              <div className="glass-card-glow p-8 flex flex-col gap-6">
                {/* Quality Select */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest mb-3 block" style={{ color: '#8888aa' }}>
                    How was it?
                  </label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setQuality('signal')}
                      className="flex-1 py-4 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer"
                      style={{
                        background: quality === 'signal' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(15, 15, 35, 0.6)',
                        border: `1px solid ${quality === 'signal' ? 'rgba(168, 85, 247, 0.5)' : 'rgba(255,255,255,0.06)'}`,
                        color: quality === 'signal' ? '#a855f7' : '#555577',
                      }}
                    >
                      <span className="block text-2xl mb-1">⚡</span>
                      Signal
                    </button>
                    <button
                      onClick={() => setQuality('noise')}
                      className="flex-1 py-4 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer"
                      style={{
                        background: quality === 'noise' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(15, 15, 35, 0.6)',
                        border: `1px solid ${quality === 'noise' ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255,255,255,0.06)'}`,
                        color: quality === 'noise' ? '#ef4444' : '#555577',
                      }}
                    >
                      <span className="block text-2xl mb-1">🌀</span>
                      Noise
                    </button>
                  </div>
                </div>

                {/* Context Note */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest mb-3 block" style={{ color: '#8888aa' }}>
                    Quick Note
                  </label>
                  <textarea
                    value={contextNote}
                    onChange={(e) => setContextNote(e.target.value)}
                    placeholder="What happened during this session?"
                    className="input-glass"
                    rows={3}
                    style={{ resize: 'none' }}
                  />
                </div>

                {/* Submit */}
                <motion.button
                  onClick={handleSubmitReview}
                  className="btn-primary w-full py-4 text-base"
                  disabled={!quality || submitting}
                  style={{
                    opacity: !quality || submitting ? 0.4 : 1,
                    cursor: !quality || submitting ? 'not-allowed' : 'pointer',
                  }}
                  whileHover={quality && !submitting ? { scale: 1.02 } : {}}
                  whileTap={quality && !submitting ? { scale: 0.98 } : {}}
                >
                  {submitting ? 'Saving...' : '✨ Save & Close'}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ─── DONE ─── */}
          {phase === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-6"
            >
              <motion.div
                className="text-6xl"
                animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.6 }}
              >
                🎯
              </motion.div>
              <h2 className="text-2xl font-bold" style={{ color: '#f0f0ff' }}>
                Well Done!
              </h2>
              <p className="text-sm" style={{ color: '#555577' }}>
                {formatTime(elapsed)} of intentional work logged
              </p>
              <motion.button
                onClick={resetSession}
                className="btn-primary px-8 py-3"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Start Another
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}
