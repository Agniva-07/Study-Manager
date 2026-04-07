import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import PageTransition, { cardVariants } from '../components/PageTransition';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { getDashboard, getSessionStats, getDashboardGravity } from '../api';
import BuilderTower from "../components/BuilderTower";
import Leaderboard from '../components/Leaderboard';

const SECTION_COLORS = {
  dsa: '#a855f7',
  dev: '#00d4ff',
  semester: '#10b981',
};

const SECTION_LABELS = {
  dsa: 'DSA',
  dev: 'Development',
  semester: 'Semester',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3" style={{ border: '1px solid rgba(168, 85, 247, 0.3)' }}>
        <p className="text-xs font-bold mb-1" style={{ color: '#f0f0ff' }}>
          {SECTION_LABELS[label] || label}
        </p>
        <p className="text-xs" style={{ color: '#a855f7' }}>
          {payload[0].value} min
        </p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [stats, setStats] = useState(null);
  const [gravity, setGravity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [dashRes, statsRes, gravRes] = await Promise.all([
          getDashboard(),
          getSessionStats(),
          getDashboardGravity(),
        ]);
        setDashboard(dashRes.data);
        setStats(statsRes.data);
        setGravity(gravRes.data);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) return <LoadingSpinner text="Loading your flow state..." />;

  const chartData = dashboard?.sectionStats
    ? Object.entries(dashboard.sectionStats).map(([key, val]) => ({
        name: key,
        minutes: val,
        fill: SECTION_COLORS[key] || '#a855f7',
      }))
    : [];

  const pieData = dashboard?.signalRatio != null
    ? [
        { name: 'Signal', value: dashboard.signalRatio * 100, fill: '#a855f7' },
        { name: 'Noise', value: (1 - dashboard.signalRatio) * 100, fill: '#1a1a3e' },
      ]
    : [];

  const totalHours = dashboard?.totalTime ? (dashboard.totalTime / 60).toFixed(1) : '0';
  const signalPct = dashboard?.signalRatio ? Math.round(dashboard.signalRatio * 100) : 0;

  return (
    <PageTransition>
      <div className="page-container">
        {/* Header */}
        <motion.div variants={cardVariants} className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: '#f0f0ff' }}>
            Command Center
          </h1>
          <p className="text-sm" style={{ color: '#555577' }}>
            Your productivity at a glance. Stay in the flow.
          </p>
        </motion.div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Focus"
            value={`${totalHours}h`}
            subtitle="Deep work hours logged"
            color="#a855f7"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12,6 12,12 16,14" />
              </svg>
            }
          />
          <StatCard
            title="Signal Ratio"
            value={`${signalPct}%`}
            subtitle="Quality focus time"
            color="#00d4ff"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            }
          />
          <StatCard
            title="Sessions"
            value={chartData.reduce((a, b) => a + b.minutes, 0) > 0 ? chartData.length : '0'}
            subtitle="Sections tracked"
            color="#10b981"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
              </svg>
            }
          />
          <StatCard
            title="Gravity Pull"
            value={gravity?.recommendation?.toUpperCase() || '—'}
            subtitle="Focus here next"
            color="#f59e0b"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            }
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Section Time Chart */}
          <motion.div variants={cardVariants} className="glass-card p-6">
            <h3 className="text-sm font-semibold uppercase tracking-widest mb-6" style={{ color: '#8888aa' }}>
              Time by Section
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} barSize={40}>
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#555577', fontSize: 12, fontFamily: "'JetBrains Mono'" }}
                  tickFormatter={(v) => SECTION_LABELS[v] || v}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#555577', fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(168, 85, 247, 0.05)' }} />
                <Bar dataKey="minutes" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Signal Ratio Pie */}
          <motion.div variants={cardVariants} className="glass-card p-6 flex flex-col items-center justify-center">
            <h3 className="text-sm font-semibold uppercase tracking-widest mb-6 self-start" style={{ color: '#8888aa' }}>
              Signal vs Noise
            </h3>
            <div className="relative">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold" style={{ color: '#a855f7' }}>
                  {signalPct}%
                </span>
                <span className="text-[10px] uppercase tracking-widest" style={{ color: '#555577' }}>
                  Signal
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Insights + Gravity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Insights */}
          <motion.div variants={cardVariants} className="glass-card-glow p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(168, 85, 247, 0.2)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5">
                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#8888aa' }}>
                AI Insights
              </h3>
            </div>
            <div className="flex flex-col gap-3">
              {stats?.insights?.length > 0 ? (
                stats.insights.map((insight, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.15 }}
                    className="flex items-start gap-3 p-3 rounded-xl"
                    style={{
                      background: 'rgba(168, 85, 247, 0.06)',
                      border: '1px solid rgba(168, 85, 247, 0.1)',
                    }}
                  >
                    <span className="text-sm mt-0.5" style={{ color: '#f59e0b' }}>⚡</span>
                    <p className="text-sm" style={{ color: '#8888aa' }}>{insight}</p>
                  </motion.div>
                ))
              ) : (
                <p className="text-sm" style={{ color: '#555577' }}>All sections are well-balanced. Keep going! 🔥</p>
              )}
            </div>
          </motion.div>

          {/* Gravity Scores */}
          <motion.div variants={cardVariants} className="glass-card-glow p-6">
            <h3 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#8888aa' }}>
              Gravity Scores
            </h3>
            <p className="text-xs mb-6" style={{ color: '#555577' }}>
              Higher score = needs more attention
            </p>
            <div className="flex flex-col gap-4">
              {gravity?.scores && Object.entries(gravity.scores).map(([sec, score], i) => {
                const maxScore = Math.max(...Object.values(gravity.scores));
                const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
                const isRec = sec === gravity.recommendation;
                return (
                  <motion.div
                    key={sec}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium" style={{ color: '#f0f0ff' }}>
                          {SECTION_LABELS[sec]}
                        </span>
                        {isRec && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold tracking-wider uppercase"
                            style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}
                          >
                            Focus
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono" style={{ color: SECTION_COLORS[sec] }}>
                        {score}
                      </span>
                    </div>
                    <div className="progress-bar-track">
                      <motion.div
                        className="progress-bar-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1, delay: 0.3 + i * 0.1 }}
                        style={{ background: `linear-gradient(90deg, ${SECTION_COLORS[sec]}, ${SECTION_COLORS[sec]}80)` }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>

        <div className="mt-8">
          <h3 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#8888aa' }}>
            Builder Tower 2.0
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <BuilderTower section="dsa" />
            <BuilderTower section="dev" />
            <BuilderTower section="semester" />
          </div>
        </div>

        <div className="mt-8">
          <Leaderboard />
        </div>
      </div>
    </PageTransition>
  );
}
