import { useEffect, useRef, useState } from 'react';

export default function usePageVisibility() {
  const [isAway, setIsAway] = useState(document.visibilityState === 'hidden');
  const [awayEvents, setAwayEvents] = useState(0);
  const [totalAwayTime, setTotalAwayTime] = useState(0);

  const awayStartedAtRef = useRef(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const now = Date.now();
      const hidden = document.visibilityState === 'hidden';

      if (hidden) {
        // user left tab
        setIsAway(true);
        awayStartedAtRef.current = now;
      } else {
        // user came back
        setIsAway(false);

        if (awayStartedAtRef.current) {
          const awayDuration = Math.floor(
            (now - awayStartedAtRef.current) / 1000
          );

          // 🔥 ignore very small tab switches (<5 sec)
          if (awayDuration > 5) {
            setTotalAwayTime(prev => prev + awayDuration);
            setAwayEvents(prev => prev + 1);
          }

          awayStartedAtRef.current = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return {
    isAway,
    awayEvents,
    totalAwayTime,
  };
}