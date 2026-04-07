import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import { getAnalyticsEnergyProfile } from '../api';

const EnergyTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const pct = Math.round((row.avgSignalRatio || 0) * 100);
  return (
    <div className="glass-card p-3" style={{ border: '1px solid rgba(0, 212, 255, 0.25)' }}>
      <p className="text-xs font-mono font-bold mb-1" style={{ color: '#f0f0ff' }}>
        {String(row.hour).padStart(2, '0')}:00
      </p>
      <p className="text-xs" style={{ color: '#00d4ff' }}>
        Signal ratio: {pct}%
      </p>
      <p className="text-xs mt-0.5" style={{ color: '#555577' }}>
        Sessions: {row.totalSessions ?? 0}
      </p>
    </div>
  );
};

export default function EnergyChart() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await getAnalyticsEnergyProfile();
        if (!cancelled) setRows(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        if (!cancelled) {
          setError('Could not load energy profile.');
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasAny = useMemo(() => rows.some((r) => (r.totalSessions || 0) > 0), [rows]);
  const bestHour = useMemo(() => {
    if (!rows.length) return null;
    return rows.reduce((best, current) => {
      if ((current.totalSessions || 0) === 0) return best;
      if (!best) return current;
      return (current.avgSignalRatio || 0) > (best.avgSignalRatio || 0) ? current : best;
    }, null);
  }, [rows]);

  if (loading) {
    return (
      <div className="rounded-2xl p-6 bg-white/5 border border-white/10 shadow-lg transition-transform duration-300 hover:scale-[1.02]">
        <h3 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#8888aa' }}>
          Energy profile
        </h3>
        <p className="text-sm" style={{ color: '#555577' }}>Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl p-6 bg-white/5 border border-white/10 shadow-lg transition-transform duration-300 hover:scale-[1.02]">
        <h3 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#8888aa' }}>
          Energy profile
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
      transition={{ duration: 0.35, delay: 0.1 }}
    >
      <h3 className="text-sm font-semibold uppercase tracking-widest mb-1" style={{ color: '#8888aa' }}>
        Energy profile
      </h3>
      <p className="text-xs mb-6" style={{ color: '#555577' }}>
        Signal quality by start hour (0–23). Bar color reflects focus quality.
      </p>
      {bestHour && (
        <p className="text-xs mb-4" style={{ color: '#86efac' }}>
          Peak Focus Hour: {String(bestHour.hour).padStart(2, '0')}:00
        </p>
      )}

      {!hasAny ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-center" style={{ color: '#555577' }}>
            No hourly data yet. Complete sessions to see when you focus best.
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="energyBarGradStrong" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <linearGradient id="energyBarGradMedium" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
              <linearGradient id="energyBarGradWeak" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fb7185" />
                <stop offset="100%" stopColor="#dc2626" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="hour"
              tick={{ fill: '#555577', fontSize: 10, fontFamily: "'JetBrains Mono'" }}
              axisLine={false}
              tickLine={false}
              interval={2}
            />
            <YAxis
              domain={[0, 1]}
              tickFormatter={(v) => `${Math.round(v * 100)}%`}
              tick={{ fill: '#555577', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip content={<EnergyTooltip />} cursor={{ fill: 'rgba(168, 85, 247, 0.06)' }} />
            <Bar dataKey="avgSignalRatio" radius={[4, 4, 0, 0]} maxBarSize={18}>
              {rows.map((entry, i) => (
                <Cell
                  key={`c-${i}`}
                  fill={
                    entry.totalSessions > 0
                      ? entry.avgSignalRatio >= 0.7
                        ? 'url(#energyBarGradStrong)'
                        : entry.avgSignalRatio >= 0.45
                        ? 'url(#energyBarGradMedium)'
                        : 'url(#energyBarGradWeak)'
                      : 'rgba(255,255,255,0.06)'
                  }
                  stroke={bestHour?.hour === entry.hour ? '#f0f0ff' : 'transparent'}
                  strokeWidth={bestHour?.hour === entry.hour ? 1.5 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  );
}
