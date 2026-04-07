import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { getAnalyticsHeatmap } from '../api';

const SECTION_BORDER = {
  dsa: 'rgba(168, 85, 247, 0.55)',
  dev: 'rgba(0, 212, 255, 0.55)',
  semester: 'rgba(16, 185, 129, 0.55)',
};

function intensityStyle(totalMinutes, section) {
  if (!totalMinutes || totalMinutes <= 0) {
    return {
      background: 'rgba(255,255,255,0.04)',
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
    };
  }
  let bg;
  if (totalMinutes <= 30) bg = 'rgba(34, 197, 94, 0.22)';
  else if (totalMinutes <= 60) bg = 'rgba(34, 197, 94, 0.42)';
  else bg = 'rgba(22, 163, 74, 0.78)';

  const border = section && SECTION_BORDER[section] ? SECTION_BORDER[section] : 'transparent';

  return {
    background: bg,
    boxShadow: section ? `inset 0 0 0 1px ${border}` : 'inset 0 0 0 1px rgba(255,255,255,0.06)',
  };
}

export default function HeatmapCalendar() {
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await getAnalyticsHeatmap();
        if (!cancelled) setDays(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        if (!cancelled) {
          setError('Could not load heatmap.');
          setDays([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const maxMin = useMemo(
    () => days.reduce((m, d) => Math.max(m, d.totalMinutes || 0), 0),
    [days]
  );
  const monthMarkers = useMemo(() => {
    return days.reduce((acc, d, idx) => {
      const date = parseISO(d.date);
      if (date.getDate() === 1 || idx === 0) {
        acc.push({ idx, label: format(date, 'MMM') });
      }
      return acc;
    }, []);
  }, [days]);

  if (loading) {
    return (
      <div className="rounded-2xl p-6 bg-white/5 border border-white/10 shadow-lg transition-transform duration-300 hover:scale-[1.02]">
        <h3 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#8888aa' }}>
          Activity heatmap
        </h3>
        <p className="text-sm" style={{ color: '#555577' }}>
          Loading…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl p-6 bg-white/5 border border-white/10 shadow-lg transition-transform duration-300 hover:scale-[1.02]">
        <h3 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#8888aa' }}>
          Activity heatmap
        </h3>
        <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
      </div>
    );
  }

  return (
    <motion.div
      className="rounded-2xl p-6 bg-white/5 border border-white/10 shadow-lg transition-transform duration-300 hover:scale-[1.02]"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#8888aa' }}>
            Activity heatmap
          </h3>
          <p className="text-xs mt-1" style={{ color: '#555577' }}>
            Last 365 days · darker = more minutes · border tint = dominant section
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider" style={{ color: '#555577' }}>
          <span>Less</span>
          <div className="flex gap-0.5">
            {['rgba(255,255,255,0.06)', 'rgba(34,197,94,0.22)', 'rgba(34,197,94,0.42)', 'rgba(22,163,74,0.78)'].map(
              (c) => (
                <span key={c} className="w-3 h-3 rounded-sm" style={{ background: c }} />
              )
            )}
          </div>
          <span>More</span>
          {maxMin > 0 && (
            <span className="ml-2 normal-case font-mono" style={{ color: '#8888aa' }}>
              max {maxMin}m / day
            </span>
          )}
        </div>
      </div>

      {days.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: '#555577' }}>
          No data yet. Log sessions to see your year at a glance.
        </p>
      ) : (
        <div className="overflow-x-auto pb-2 -mx-1 px-1">
          <div className="min-w-max mx-auto">
            <div className="relative h-4 mb-2">
              {monthMarkers.map((m) => (
                <span
                  key={`${m.idx}-${m.label}`}
                  className="absolute text-[10px] font-medium"
                  style={{
                    color: '#555577',
                    left: `${(m.idx / Math.max(days.length - 1, 1)) * 100}%`,
                    transform: 'translateX(-50%)',
                  }}
                >
                  {m.label}
                </span>
              ))}
            </div>
            <div
              className="inline-grid gap-[3px] min-w-max mx-auto"
              style={{ gridTemplateColumns: 'repeat(53, minmax(0, 12px))' }}
              role="grid"
              aria-label="365-day study heatmap"
            >
              {days.map((d) => (
                <motion.div
                  key={d.date}
                  className="w-3 h-3 rounded-[3px] cursor-default"
                  style={intensityStyle(d.totalMinutes, d.dominantSection)}
                  whileHover={{ scale: 1.22 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  onMouseEnter={() => setHovered(d)}
                  onMouseLeave={() => setHovered(null)}
                />
              ))}
            </div>
            {hovered && (
              <div className="mt-3 text-center">
                <div className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 bg-[#0f1222]/90 border border-white/10 shadow-lg">
                  <span className="text-[11px] font-mono" style={{ color: '#f0f0ff' }}>
                    {format(parseISO(hovered.date), 'MMM d, yyyy')}
                  </span>
                  <span className="text-[11px]" style={{ color: '#22c55e' }}>
                    {hovered.totalMinutes || 0} min
                  </span>
                </div>
              </div>
            )}
          </div>
          <p className="text-[10px] mt-3 font-mono" style={{ color: '#444466' }}>
            {days.length > 0 && (
              <>
                {format(parseISO(days[0].date), 'MMM d, yyyy')} →{' '}
                {format(parseISO(days[days.length - 1].date), 'MMM d, yyyy')}
              </>
            )}
          </p>
        </div>
      )}
    </motion.div>
  );
}
