import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid,
} from 'recharts';
import PageTransition, { cardVariants } from '../components/PageTransition';
import LoadingSpinner from '../components/LoadingSpinner';
import HeatmapCalendar from '../components/HeatmapCalendar';
import StreakDNA from '../components/StreakDNA';
import EnergyChart from '../components/EnergyChart';
import { getDashboardTrends, getAnalyticsSummary } from '../api';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3" style={{ border: '1px solid rgba(168, 85, 247, 0.3)' }}>
        <p className="text-xs font-mono font-bold mb-2" style={{ color: '#f0f0ff' }}>{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-xs" style={{ color: entry.color }}>
            {entry.name === 'total' ? 'Total' : 'Signal'}: {entry.value} min
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  const [trends, setTrends] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [trendsRes, summaryRes] = await Promise.allSettled([
          getDashboardTrends(),
          getAnalyticsSummary(),
        ]);
        if (trendsRes.status === 'fulfilled') {
          setTrends(trendsRes.value.data?.daily || []);
        }
        if (summaryRes.status === 'fulfilled') {
          setSummary(summaryRes.value.data || null);
        }
      } catch (err) {
        console.error('Analytics fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <LoadingSpinner text="Analyzing patterns..." />;

  // Compute noise data
  const chartData = trends.map((d) => ({
    ...d,
    noise: d.total - d.signal,
  }));

  const totalFocus = chartData.reduce((s, d) => s + d.total, 0);
  const totalSignal = chartData.reduce((s, d) => s + d.signal, 0);
  const totalNoise = totalFocus - totalSignal;
  const avgDaily = chartData.length > 0 ? Math.round(totalFocus / chartData.length) : 0;

  return (
    <PageTransition>
      <div className="page-container">
        {/* Header */}
        <motion.div variants={cardVariants} className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: '#f0f0ff' }}>
            Analytics
          </h1>
          <p className="text-sm" style={{ color: '#555577' }}>
            Your focus patterns over time
          </p>
        </motion.div>

        {/* All-time summary (from /analytics/summary) */}
        {summary && (
          <motion.div
            variants={cardVariants}
            className="rounded-2xl p-6 mb-8 flex flex-wrap gap-6 justify-between items-center bg-white/5 border border-white/10 shadow-lg transition-transform duration-300 hover:scale-[1.02]"
          >
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#555577' }}>
                All-time total
              </p>
              <p className="text-lg font-bold font-mono" style={{ color: '#a855f7' }}>
                {summary.totalMinutes ?? 0} min
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#555577' }}>
                Avg signal
              </p>
              <p className="text-lg font-bold font-mono" style={{ color: '#00d4ff' }}>
                {summary.averageSignalPercent ?? 0}%
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#555577' }}>
                Sessions logged
              </p>
              <p className="text-lg font-bold font-mono" style={{ color: '#10b981' }}>
                {summary.totalSessions ?? 0}
              </p>
            </div>
          </motion.div>
        )}

        {/* Top stats */}
        <div className="grid grid-cols-3 gap-4 mt-8">
          {[
            { label: 'Total Focus', value: `${(totalFocus / 60).toFixed(1)}h`, color: '#a855f7' },
            { label: 'Avg Daily', value: `${avgDaily}m`, color: '#10b981' },
            {
              label: 'Signal Ratio',
              value: `${totalFocus > 0 ? Math.round((totalSignal / totalFocus) * 100) : 0}%`,
              color: '#00d4ff',
            },
          ].map((stat, i) => (
            <motion.div
              key={`${stat.label}-${i}`}
              variants={cardVariants}
              className="rounded-2xl p-6 text-center bg-white/5 border border-white/10 shadow-lg transition-transform duration-300 hover:scale-[1.02]"
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#555577' }}>
                {stat.label}
              </p>
              <p className="text-xl font-bold" style={{ color: stat.color }}>
                {stat.value}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="mt-8">
          <HeatmapCalendar />
        </div>

        <div className="grid grid-cols-2 gap-6 mt-8">
          <StreakDNA />
          <EnergyChart />
        </div>

        {/* Main trend chart */}
        <motion.div
          variants={cardVariants}
          className="rounded-2xl p-6 mt-8 bg-white/5 border border-white/10 shadow-lg transition-transform duration-300 hover:scale-[1.02]"
        >
          <h3 className="text-sm font-semibold uppercase tracking-widest mb-6" style={{ color: '#8888aa' }}>
            Daily Progress
          </h3>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm" style={{ color: '#555577' }}>No data yet. Complete sessions to see trends.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="signalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#555577', fontSize: 11, fontFamily: "'JetBrains Mono'" }}
                  tickFormatter={(v) => {
                    const d = new Date(v);
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#555577', fontSize: 11 }}
                  tickFormatter={(v) => `${v}m`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#a855f7"
                  strokeWidth={2}
                  fill="url(#totalGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#a855f7', stroke: '#050510', strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="signal"
                  stroke="#00d4ff"
                  strokeWidth={2}
                  fill="url(#signalGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#00d4ff', stroke: '#050510', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Signal vs Noise Breakdown */}
        <motion.div
          variants={cardVariants}
          className="rounded-2xl p-6 mt-8 bg-white/5 border border-white/10 shadow-lg transition-transform duration-300 hover:scale-[1.02]"
        >
          <h3 className="text-sm font-semibold uppercase tracking-widest mb-6" style={{ color: '#8888aa' }}>
            Signal vs Noise Breakdown
          </h3>
          <div className="flex flex-col md:flex-row gap-8 items-center">
            {/* Visual bar */}
            <div className="flex-1 w-full">
              <div className="flex items-center gap-4 mb-3">
                <span className="text-xs font-medium" style={{ color: '#a855f7' }}>⚡ Signal</span>
                <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'rgba(15, 15, 35, 0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, #a855f7, #7c3aed)' }}
                    initial={{ width: 0 }}
                    animate={{ width: totalFocus > 0 ? `${(totalSignal / totalFocus) * 100}%` : '0%' }}
                    transition={{ duration: 1.2, delay: 0.3 }}
                  />
                </div>
                <span className="text-xs font-mono" style={{ color: '#a855f7' }}>
                  {totalFocus > 0 ? Math.round((totalSignal / totalFocus) * 100) : 0}%
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-medium" style={{ color: '#ef4444' }}>🌀 Noise</span>
                <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'rgba(15, 15, 35, 0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, #ef4444, #dc2626)' }}
                    initial={{ width: 0 }}
                    animate={{ width: totalFocus > 0 ? `${(totalNoise / totalFocus) * 100}%` : '0%' }}
                    transition={{ duration: 1.2, delay: 0.5 }}
                  />
                </div>
                <span className="text-xs font-mono" style={{ color: '#ef4444' }}>
                  {totalFocus > 0 ? Math.round((totalNoise / totalFocus) * 100) : 0}%
                </span>
              </div>
            </div>
            {/* Numbers */}
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold" style={{ color: '#a855f7' }}>
                  {(totalSignal / 60).toFixed(1)}
                </p>
                <p className="text-[10px] uppercase tracking-widest" style={{ color: '#555577' }}>hrs signal</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold" style={{ color: '#ef4444' }}>
                  {(totalNoise / 60).toFixed(1)}
                </p>
                <p className="text-[10px] uppercase tracking-widest" style={{ color: '#555577' }}>hrs noise</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
