import { motion } from 'framer-motion';
import { cardVariants } from './PageTransition';

export default function StatCard({ title, value, subtitle, icon, color = '#a855f7', delay = 0 }) {
  return (
    <motion.div
      variants={cardVariants}
      className="glass-card p-6 relative overflow-hidden group"
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      {/* Ambient glow */}
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-20 group-hover:opacity-40 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle, ${color}40, transparent 70%)`,
        }}
      />

      {/* Icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
        style={{
          background: `${color}15`,
          border: `1px solid ${color}30`,
        }}
      >
        <span style={{ color }}>{icon}</span>
      </div>

      {/* Content */}
      <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: '#8888aa' }}>
        {title}
      </p>
      <h3
        className="text-2xl md:text-3xl font-bold mb-1"
        style={{ color: '#f0f0ff' }}
      >
        {value}
      </h3>
      {subtitle && (
        <p className="text-xs" style={{ color: '#555577' }}>
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}
