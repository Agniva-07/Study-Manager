import { motion } from 'framer-motion';

export default function LoadingSpinner({ size = 40, text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <motion.div
        className="rounded-full"
        style={{
          width: size,
          height: size,
          border: '2px solid rgba(168, 85, 247, 0.15)',
          borderTop: '2px solid #a855f7',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
      <motion.p
        className="text-sm font-medium"
        style={{ color: '#555577' }}
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {text}
      </motion.p>
    </div>
  );
}
