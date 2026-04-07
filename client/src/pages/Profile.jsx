import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import PageTransition, { cardVariants } from '../components/PageTransition';
import { motion } from 'framer-motion';
import LoadingSpinner from '../components/LoadingSpinner';
import { getPublicProfile, getWeeklyStats } from '../api';

export default function Profile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [weekly, setWeekly] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [profileRes, weeklyRes] = await Promise.all([
          getPublicProfile(id),
          getWeeklyStats(id),
        ]);
        setProfile(profileRes.data || null);
        setWeekly(weeklyRes.data?.weeklySessions || []);
      } catch (error) {
        setProfile(null);
        setWeekly([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const weeklyMax = useMemo(
    () => (weekly.length ? Math.max(...weekly.map((item) => item.count), 1) : 1),
    [weekly]
  );

  if (loading) return <LoadingSpinner text="Loading profile..." />;
  if (!profile) return <div className="page-container text-sm text-red-400">Profile not found.</div>;

  return (
    <PageTransition>
      <div className="page-container">
        <motion.div variants={cardVariants} className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: '#f0f0ff' }}>
            {profile.name}
          </h1>
          <p className="text-sm" style={{ color: '#555577' }}>
            Public profile and weekly consistency.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <motion.div variants={cardVariants} className="glass-card p-5">
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: '#8888aa' }}>XP</p>
            <p className="text-2xl font-bold" style={{ color: '#a855f7' }}>{profile.totalXP}</p>
          </motion.div>
          <motion.div variants={cardVariants} className="glass-card p-5">
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: '#8888aa' }}>Streak</p>
            <p className="text-2xl font-bold" style={{ color: '#ff7a7a' }}>{profile.streak}d</p>
          </motion.div>
          <motion.div variants={cardVariants} className="glass-card p-5">
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: '#8888aa' }}>Builder Summary</p>
            <p className="text-2xl font-bold" style={{ color: '#10b981' }}>{profile.totalBricks} bricks</p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div variants={cardVariants} className="glass-card p-6">
            <h3 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#8888aa' }}>
              Section Breakdown
            </h3>
            <div className="space-y-3">
              {Object.entries(profile.sectionStats || {}).map(([label, count]) => (
                <div key={label} className="flex items-center justify-between rounded-lg p-3 border"
                  style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
                >
                  <p className="text-sm" style={{ color: '#f0f0ff' }}>{label}</p>
                  <p className="text-sm font-bold" style={{ color: '#a855f7' }}>{count}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div variants={cardVariants} className="glass-card p-6">
            <h3 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#8888aa' }}>
              Weekly Sessions
            </h3>
            <div className="space-y-3">
              {weekly.map((item) => (
                <div key={item.day} className="flex items-center gap-3">
                  <span className="w-8 text-xs" style={{ color: '#b4b4cd' }}>{item.day}</span>
                  <div className="flex-1 h-3 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div
                      className="h-3 rounded-full"
                      style={{
                        width: `${(item.count / weeklyMax) * 100}%`,
                        minWidth: item.count > 0 ? '8px' : '0px',
                        background: 'linear-gradient(90deg, #a855f7, #7c3aed)',
                      }}
                    />
                  </div>
                  <span className="w-6 text-right text-xs" style={{ color: '#f0f0ff' }}>{item.count}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
