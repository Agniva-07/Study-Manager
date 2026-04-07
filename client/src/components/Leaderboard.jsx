import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLeaderboard } from '../api';
import { useAuth } from '../context/useAuth';

const rankStyle = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getLeaderboard();
        setRows(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const topRows = useMemo(() => rows.slice(0, 10), [rows]);
  const currentUserId = user?.id || user?._id;

  if (loading) {
    return <div className="glass-card p-4 text-sm text-gray-400">Loading leaderboard...</div>;
  }

  return (
    <div className="glass-card p-6">
      <h3 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#8888aa' }}>
        Leaderboard
      </h3>
      <div className="space-y-2">
        {topRows.map((row, index) => {
          const isCurrentUser = String(row.userId) === String(currentUserId);
          return (
            <Link
              key={row.userId || `${row.name}-${index}`}
              to={`/profile/${row.userId}`}
              className="flex items-center justify-between rounded-xl p-3 border transition"
              style={{
                background: isCurrentUser ? 'rgba(168, 85, 247, 0.14)' : 'rgba(255,255,255,0.02)',
                borderColor: isCurrentUser ? 'rgba(168, 85, 247, 0.45)' : 'rgba(255,255,255,0.08)',
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm" style={{ color: '#f0f0ff' }}>
                  {rankStyle[index] || `#${index + 1}`}
                </span>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#f0f0ff' }}>
                    {row.name}
                  </p>
                  <p className="text-xs" style={{ color: '#8888aa' }}>
                    {row.totalBricks} bricks • {row.streak}d streak
                  </p>
                </div>
              </div>
              <p className="text-sm font-bold" style={{ color: '#a855f7' }}>
                {row.totalXP} XP
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
