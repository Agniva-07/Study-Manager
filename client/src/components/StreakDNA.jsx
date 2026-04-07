import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getAnalyticsStreakDna } from '../api';

const WEEK_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function StreakDNA() {
  const [weakDays, setWeakDays] = useState([]);
  const [suggestion, setSuggestion] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await getAnalyticsStreakDna();
        if (!cancelled) {
          setWeakDays(Array.isArray(res.data?.weakDays) ? res.data.weakDays : []);
          setSuggestion(typeof res.data?.suggestion === 'string' ? res.data.suggestion : '');
        }
      } catch (e) {
        if (!cancelled) {
          setError('Could not load streak insights.');
          setWeakDays([]);
          setSuggestion('');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl p-6 bg-white/5 border border-white/10 shadow-lg transition-transform duration-300 hover:scale-[1.02]">
        <h3 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#8888aa' }}>
          Streak DNA
        </h3>
        <p className="text-sm" style={{ color: '#555577' }}>Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl p-6 bg-white/5 border border-white/10 shadow-lg transition-transform duration-300 hover:scale-[1.02]">
        <h3 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#8888aa' }}>
          Streak DNA
        </h3>
        <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
      </div>
    );
  }

  const weakSet = new Set(weakDays.map((d) => String(d).slice(0, 3).toLowerCase()));

  return (
    <motion.div
      className="rounded-2xl p-6 h-full flex flex-col bg-white/5 border border-white/10 shadow-lg transition-transform duration-300 hover:scale-[1.02]"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🧬</span>
        <h3 className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#8888aa' }}>
          Consistency Pattern
        </h3>
      </div>
      <p className="text-xs mb-4" style={{ color: '#555577' }}>
        Last 28 days by weekday strength
      </p>

      <div className="grid grid-cols-7 gap-2 mb-4">
        {WEEK_ORDER.map((day) => {
          const isWeak = weakSet.has(day.toLowerCase());
          return (
            <div
              key={day}
              className="rounded-lg px-2 py-3 text-center border transition-all duration-300"
              style={{
                background: isWeak ? 'rgba(239, 68, 68, 0.16)' : 'rgba(16, 185, 129, 0.18)',
                borderColor: isWeak ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.35)',
                color: isWeak ? '#fca5a5' : '#86efac',
              }}
            >
              <p className="text-[11px] font-semibold">{day}</p>
              <p className="text-[10px] mt-1 uppercase tracking-wider">{isWeak ? 'Weak' : 'Strong'}</p>
            </div>
          );
        })}
      </div>

      {weakDays.length === 0 && (
        <div
          className="rounded-xl p-4 text-sm"
          style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            color: '#6ee7b7',
          }}
        >
          No weak days detected. Keep the rhythm going.
        </div>
      )}

      {suggestion && (
        <p className="text-sm leading-relaxed mt-auto" style={{ color: '#8888aa' }}>
          {suggestion}
        </p>
      )}
    </motion.div>
  );
}
