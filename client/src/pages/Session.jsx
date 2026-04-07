import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PageTransition, { cardVariants } from '../components/PageTransition';
import PomodoroTimer from '../components/PomodoroTimer';
import usePageVisibility from '../hooks/usePageVisibility';
import { createSession, updateSession } from '../api';

const SECTIONS = [
  { key: 'dsa', label: 'DSA', color: '#a855f7', emoji: '🧠' },
  { key: 'dev', label: 'Development', color: '#00d4ff', emoji: '💻' },
  { key: 'semester', label: 'Semester', color: '#10b981', emoji: '📚' },
];

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function Session() {
  const [phase, setPhase] = useState('setup');
  const [section, setSection] = useState('');
  const [intention, setIntention] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [focusStats, setFocusStats] = useState({
    pomodorosCompleted: 0,
    totalWorkSeconds: 0,
    totalElapsedSeconds: 0,
  });

  const [sessionAwayEvents, setSessionAwayEvents] = useState(0);
  const [sessionAwayTime, setSessionAwayTime] = useState(0);

  const awayBaselineRef = useRef({ awayEvents: 0, totalAwayTime: 0 });
  const { awayEvents, totalAwayTime } = usePageVisibility();

  useEffect(() => {
    if (phase !== 'running') return;

    setSessionAwayEvents(Math.max(0, awayEvents - awayBaselineRef.current.awayEvents));
    setSessionAwayTime(Math.max(0, totalAwayTime - awayBaselineRef.current.totalAwayTime));
  }, [awayEvents, totalAwayTime, phase]);

  const handleStart = async () => {
    if (!section || !intention.trim()) return;

    try {
      const res = await createSession({
        section,
        intention,
        duration: 0,
        startTime: new Date().toISOString(),
      });

      setSessionId(res.data._id);

      awayBaselineRef.current = {
        awayEvents,
        totalAwayTime,
      };

      setFocusStats({
        pomodorosCompleted: 0,
        totalWorkSeconds: 0,
        totalElapsedSeconds: 0,
      });

      setSessionAwayEvents(0);
      setSessionAwayTime(0);

      setPhase('running');
    } catch (err) {
      console.error(err);
    }
  };

  const handleEnd = () => {
    setElapsed(focusStats.totalElapsedSeconds);
    setPhase('review');
  };

  const handleSubmitReview = async () => {
    setSubmitting(true);

    try {
      const signalMinutes = Math.max(
        0,
        Math.ceil((focusStats.totalWorkSeconds - sessionAwayTime) / 60)
      );

      const totalMinutes = Math.ceil(focusStats.totalElapsedSeconds / 60);
      const signalRatio = totalMinutes ? signalMinutes / totalMinutes : 0;

      let quality = 'noise';
      if (signalRatio >= 0.7) quality = 'signal';
      else if (signalRatio >= 0.4) quality = 'mixed';

      await updateSession(sessionId, {
        duration: totalMinutes,
        actualFocusTime: signalMinutes,
        pomodorosCompleted: focusStats.pomodorosCompleted,
        awayEvents: sessionAwayEvents,
        quality,
      });

      setPhase('done');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const resetSession = () => {
    setPhase('setup');

    setTimeout(() => {
      setSection('');
      setIntention('');
      setSessionId(null);

      setFocusStats({
        pomodorosCompleted: 0,
        totalWorkSeconds: 0,
        totalElapsedSeconds: 0,
      });

      setSessionAwayEvents(0);
      setSessionAwayTime(0);
    }, 0);
  };

  return (
    <PageTransition>
      <div className="flex flex-col items-center justify-center min-h-[80vh]">

        <AnimatePresence mode="wait">

          {/* SETUP */}
          {phase === 'setup' && (
            <motion.div key="setup" className="w-full max-w-md">
              <h1 className="text-3xl font-bold text-center mb-6">Enter the Flow</h1>

              <div className="glass-card-glow p-6 flex flex-col gap-4">

                <div>
          <label className="text-xs font-semibold uppercase tracking-widest mb-3 block text-gray-400">
            Section
          </label>

          <div className="flex gap-3">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                className="flex-1 py-3 rounded-xl text-sm font-medium transition-all duration-300"
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

                <input
                  value={intention}
                  onChange={e => setIntention(e.target.value)}
                  placeholder="Your focus..."
                  className="input-glass"
                />

                <button
                  onClick={handleStart}
                  className="btn-primary"
                >
                  Start Session
                </button>

              </div>
            </motion.div>
          )}

          {/* RUNNING */}
          {phase === 'running' && (
            <motion.div key="running" className="flex flex-col items-center gap-6">

              <PomodoroTimer
                awayEvents={sessionAwayEvents}
                onCompleteSession={handleEnd}
                onFocusStats={setFocusStats}
              />

              <p className="text-sm text-gray-400">{intention}</p>

            </motion.div>
          )}

          {/* REVIEW (AUTO SUMMARY) */}
          {phase === 'review' && (
            <motion.div key="review" className="glass-card-glow p-6 w-full max-w-md">

              {(() => {
                const signalMinutes = Math.max(
                  0,
                  Math.ceil((focusStats.totalWorkSeconds - sessionAwayTime) / 60)
                );

                const totalMinutes = Math.ceil(focusStats.totalElapsedSeconds / 60);
                const noiseMinutes = totalMinutes - signalMinutes;

                const ratio = totalMinutes ? signalMinutes / totalMinutes : 0;

                let label = "Noise ❌";
                if (ratio >= 0.7) label = "Signal ⚡";
                else if (ratio >= 0.4) label = "Mixed ⚠️";

                return (
                  <>
                    <h2 className="text-xl font-bold text-center mb-4">
                      Session Complete 🎯
                    </h2>

                    <div className="grid grid-cols-2 text-center">
                      <div>
                        <p className="text-lg text-purple-400">{signalMinutes}m</p>
                        <p className="text-xs">Focus</p>
                      </div>
                      <div>
                        <p className="text-lg text-red-400">{noiseMinutes}m</p>
                        <p className="text-xs">Distraction</p>
                      </div>
                    </div>

                    <p className="text-center mt-4 font-semibold">{label}</p>

                    <button
                      onClick={handleSubmitReview}
                      className="btn-primary mt-4 w-full"
                    >
                      {submitting ? "Saving..." : "Save Session"}
                    </button>
                  </>
                );
              })()}

            </motion.div>
          )}

          {/* DONE */}
          {phase === 'done' && (
            <motion.div key="done" className="flex flex-col items-center gap-4">

              <h2 className="text-xl font-bold">Well Done 🎯</h2>

              <button
                onClick={resetSession}
                className="btn-primary"
              >
                Start Another
              </button>

            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </PageTransition>
  );
}