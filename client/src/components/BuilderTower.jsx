import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { getBuilderStats } from '../api';

const SECTION_CONFIG = {
  dsa: { label: 'DSA', color: '#3b82f6' },
  dev: { label: 'Dev', color: '#a855f7' },
  semester: { label: 'Semester', color: '#f97316' },
};

function formatDate(dateValue) {
  const d = new Date(dateValue);
  return d.toLocaleDateString();
}

function BuilderTower({ section, enableSound = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [levelUpPulse, setLevelUpPulse] = useState(false);
  const prevStreakRef = useRef(null);
  const prevLevelRef = useRef(null);
  const audioCtxRef = useRef(null);

  const normalizedSection = String(section || '').toLowerCase();
  const sectionInfo = SECTION_CONFIG[normalizedSection] || SECTION_CONFIG.dsa;

  useEffect(() => {
    const fetchTower = async () => {
      setLoading(true);
      try {
        const res = await getBuilderStats(normalizedSection);
        setData(res.data);
        setError('');
      } catch (err) {
        setError('Unable to load tower right now.');
      } finally {
        setLoading(false);
      }
    };
    fetchTower();
  }, [normalizedSection]);

  useEffect(() => {
    if (!data) return;

    if (enableSound && data.totalBricks > 0) {
      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        const ctx = audioCtxRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = 220;
        gain.gain.value = 0.015;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.06);
      } catch (_) {
        // Non-blocking fallback if browser blocks autoplay audio.
      }
    }

    if (prevLevelRef.current != null && data.level > prevLevelRef.current) {
      setLevelUpPulse(true);
      const timer = setTimeout(() => setLevelUpPulse(false), 800);
      prevLevelRef.current = data.level;
      return () => clearTimeout(timer);
    }

    if (prevStreakRef.current != null && data.streak < prevStreakRef.current) {
      setShake(true);
      const t = setTimeout(() => setShake(false), 500);
      return () => clearTimeout(t);
    }
    prevLevelRef.current = data.level;
    prevStreakRef.current = data.streak;
    return undefined;
  }, [data, enableSound]);
  const totalBricks = data?.totalBricks || 0;
  const floors = data?.floors || [];
  const sessions = data?.sessions || [];
  const latestBrickId = sessions.length ? sessions[sessions.length - 1]._id : null;
  const towerSessions = useMemo(
    () =>
      sessions.map((session, index) => ({
        ...session,
        floorNumber: Math.floor(index / 10) + 1,
        showSeparator: index > 0 && index % 10 === 0,
        isLatest: session._id === latestBrickId,
        depth: Math.min(26, 8 + (index % 12)),
        delay: Math.min(index * 0.012, 0.35),
      })),
    [sessions, latestBrickId]
  );

  const levelProgress = useMemo(() => {
    if (!data) return 0;
    return data.levelProgressPercent ?? 0;
  }, [data]);
  const dailyGoal = data?.dailyGoal ?? 3;
  const todaySessions = data?.todaySessions ?? 0;
  const goalProgressPercent = Math.min(100, Math.round((todaySessions / dailyGoal) * 100));
  const achievements = data?.achievements ?? [];

  if (loading) {
    return <div className="glass-card p-4 text-sm text-gray-400">Building tower...</div>;
  }

  if (error) {
    return <div className="glass-card p-4 text-sm text-red-400">{error}</div>;
  }

  return (
    <motion.div
      className="glass-card-glow p-5 rounded-2xl"
      animate={shake ? { x: [0, -6, 6, -3, 3, 0] } : { x: 0 }}
      transition={{ duration: 0.45 }}
    >
      <p className="text-xs uppercase tracking-widest mb-1" style={{ color: '#8888aa' }}>
        {sectionInfo.label}
      </p>
      <p className="text-sm mb-1" style={{ color: '#c9c9dd' }}>
        {`You're building your ${sectionInfo.label} foundation`}
      </p>
      <motion.p
        className="text-lg font-bold mb-3"
        style={{ color: '#f0f0ff' }}
        animate={levelUpPulse ? { scale: [1, 1.08, 1], textShadow: ['0 0 0px #fff', `0 0 14px ${sectionInfo.color}`, '0 0 0px #fff'] } : { scale: 1 }}
        transition={{ duration: 0.75 }}
      >
        {`Level ${data?.level || 1} unlocked`}
      </motion.p>

      <div className="flex items-center justify-between mb-2 text-xs" style={{ color: '#aaaacc' }}>
        <span>{`XP: ${data?.totalXP || 0}`}</span>
        <span>{`${levelProgress}% to next level`}</span>
      </div>
      <div className="w-full h-2 rounded-full mb-3" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <motion.div
          className="h-2 rounded-full"
          style={{ background: sectionInfo.color }}
          initial={{ width: 0 }}
          animate={{ width: `${levelProgress}%` }}
          transition={{ duration: 0.7 }}
        />
      </div>

      <div className="flex items-center justify-between mb-4 text-xs">
        <motion.span
          style={{ color: '#ff7a7a' }}
          animate={
            (data?.streak || 0) > 0
              ? {
                  textShadow: ['0 0 0px #ff7a7a', '0 0 10px #ff7a7a', '0 0 0px #ff7a7a'],
                  scale: [1, 1.03, 1],
                }
              : { textShadow: '0 0 0px #ff7a7a', scale: 1 }
          }
          transition={{ duration: 1.6, repeat: (data?.streak || 0) > 0 ? Infinity : 0 }}
        >
          {`🔥 Streak: ${data?.streak || 0}d`}
        </motion.span>
        <span style={{ color: '#8888aa' }}>{`${totalBricks} bricks`}</span>
      </div>

      <div className="mb-4 p-3 rounded-lg border border-white/10" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="flex items-center justify-between text-xs mb-1">
          <span style={{ color: '#b9b9d2' }}>Daily Goal</span>
          <span style={{ color: '#d8d8ef' }}>{`${todaySessions} / ${dailyGoal} sessions completed`}</span>
        </div>
        <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <motion.div
            className="h-1.5 rounded-full"
            style={{ background: '#22c55e' }}
            initial={{ width: 0 }}
            animate={{ width: `${goalProgressPercent}%` }}
            transition={{ duration: 0.45 }}
          />
        </div>
        {data?.goalCompleted ? (
          <p className="text-xs mt-2" style={{ color: '#34d399' }}>
            Goal completed 🎯
          </p>
        ) : null}
      </div>

      {totalBricks === 0 ? (
        <div
          className="h-56 flex flex-col gap-2 items-center justify-center rounded-xl border border-white/10 text-sm"
          style={{ background: 'radial-gradient(circle at top, rgba(59,130,246,0.08), rgba(0,0,0,0))' }}
        >
          <span className="text-xl">🧱</span>
          <span className="text-gray-300 font-medium">Start building your tower</span>
          <span className="text-gray-500 text-xs">Complete one focused session to place your first brick.</span>
        </div>
      ) : (
        <motion.div
          className="relative h-80 rounded-xl p-3 border border-white/10 overflow-y-auto"
          style={{
            perspective: '1000px',
            background: 'linear-gradient(180deg, rgba(12,12,30,0.6), rgba(8,8,18,0.9))',
          }}
          whileHover={{ rotateY: 5, rotateX: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 14 }}
        >
          <div className="flex flex-col-reverse gap-1.5" style={{ transformStyle: 'preserve-3d' }}>
            {towerSessions.map((session) => {
              const isSignal = session.quality === 'signal';

              return (
                <div key={session._id}>
                  {session.showSeparator ? (
                    <motion.div
                      className="my-2 text-[10px] text-center relative"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{ color: '#b7b7ce' }}
                    >
                      <span
                        className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px"
                        style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.22), rgba(255,255,255,0))' }}
                      />
                      <span className="relative px-2" style={{ background: 'rgba(8,8,18,0.85)' }}>
                        {`Level ${session.floorNumber} unlocked`}
                      </span>
                    </motion.div>
                  ) : null}

                  <motion.div
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={
                      session.isLatest
                        ? {
                            scaleY: 1,
                            opacity: 1,
                            boxShadow: [
                              `0 0 8px ${sectionInfo.color}`,
                              `0 0 16px ${sectionInfo.color}`,
                              `0 0 8px ${sectionInfo.color}`,
                            ],
                            y: [0, -2, 0],
                          }
                        : { scaleY: 1, opacity: 1 }
                    }
                    transition={
                      session.isLatest
                        ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: session.delay }
                        : { duration: 0.35, delay: session.delay }
                    }
                    whileHover={{ scaleY: 1.08 }}
                    style={{
                      width: '100%',
                      height: '8px',
                      margin: '2px 0',
                      borderRadius: '2px',
                      background: isSignal
                        ? sectionInfo.color
                        : `repeating-linear-gradient(135deg, ${sectionInfo.color}55, ${sectionInfo.color}55 3px, rgba(0,0,0,0.25) 3px, rgba(0,0,0,0.25) 6px)`,
                      opacity: isSignal ? 1 : 0.35,
                      boxShadow: isSignal ? `0 0 10px ${sectionInfo.color}` : 'none',
                      transform: `translateZ(${session.depth}px)`,
                      transformOrigin: 'bottom',
                    }}
                    title={`${formatDate(session.date)} | ${session.duration} min | ${session.quality}`}
                  />
                </div>
              );
            })}
          </div>

          <div
            className="absolute inset-x-2 bottom-2 h-3 rounded-full"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.45), rgba(0,0,0,0))',
              transform: 'translateZ(0)',
            }}
          />
        </motion.div>
      )}

      <div className="mt-3 text-xs" style={{ color: '#8888aa' }}>
        {`Floors: ${floors.length}`}
      </div>

      <div className="mt-3">
        <p className="text-xs mb-2" style={{ color: '#8888aa' }}>Achievements</p>
        <div className="flex flex-wrap gap-2">
          {achievements.map((badge) => (
            <span
              key={badge.title}
              className="text-[10px] px-2 py-1 rounded-full border"
              style={{
                color: badge.unlocked ? '#f0f0ff' : '#777799',
                background: badge.unlocked ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.03)',
                borderColor: badge.unlocked ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.12)',
              }}
            >
              {badge.title}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default memo(BuilderTower);