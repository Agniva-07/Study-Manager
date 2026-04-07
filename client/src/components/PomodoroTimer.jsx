import { useEffect, useMemo, useRef, useState } from 'react';
import usePomodoro from '../hooks/usePomodoro';
import TimerSettings from './TimerSettings';

function formatMMSS(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getNotificationBody(mode) {
  if (mode === 'work') return 'Time for a break 🎉';
  return 'Break finished. Back to focus 💪';
}

const SOUND_FILES = {
  rain: '/sounds/rain.mp3',
  lofi: '/sounds/lofi.mp3',
};

export default function PomodoroTimer({
  awayEvents,
  onCompleteSession,
  onFocusStats,
}) {
  const {
    mode,
    timeLeft,
    isRunning,
    pomodoroCount,
    settings,
    startTimer,
    pauseTimer,
    resetTimer,
    updateSettings,
    totalElapsedSeconds,
    totalWorkSeconds,
    modeLabels,
  } = usePomodoro();

  const [selectedSound, setSelectedSound] = useState('none');
  const audioRef = useRef(null);
  const prevModeRef = useRef(mode);

  const modeDurationSeconds = useMemo(() => {
    if (mode === 'work') return settings.workDuration * 60;
    if (mode === 'shortBreak') return settings.shortBreak * 60;
    return settings.longBreak * 60;
  }, [mode, settings.longBreak, settings.shortBreak, settings.workDuration]);

  const progressPercent = useMemo(() => {
    if (!modeDurationSeconds) return 0;
    const done = modeDurationSeconds - timeLeft;
    return Math.max(0, Math.min(100, (done / modeDurationSeconds) * 100));
  }, [modeDurationSeconds, timeLeft]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (prevModeRef.current !== mode) {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Session Complete', {
          body: getNotificationBody(prevModeRef.current),
        });
      }
      prevModeRef.current = mode;
    }
  }, [mode]);

  useEffect(() => {
    onFocusStats({
      pomodorosCompleted: pomodoroCount,
      totalWorkSeconds,
      totalElapsedSeconds,
    });
  }, [onFocusStats, pomodoroCount, totalElapsedSeconds, totalWorkSeconds]);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = true;
      audioRef.current.volume = 0.35;
    }
    const player = audioRef.current;

    if (mode === 'work' && isRunning && selectedSound !== 'none') {
      const src = SOUND_FILES[selectedSound];
      if (player.src !== `${window.location.origin}${src}`) {
        player.src = src;
      }
      player.play().catch(() => undefined);
    } else {
      player.pause();
      player.currentTime = 0;
    }

    return () => {
      player.pause();
    };
  }, [isRunning, mode, selectedSound]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  return (
    <div className="w-full max-w-lg flex flex-col gap-5">
      <div className="glass-card-glow p-8 rounded-2xl text-center">
        <div className="text-xs uppercase tracking-widest mb-2" style={{ color: '#8888aa' }}>
          {modeLabels[mode]}
        </div>
        <div className="text-6xl font-bold mb-3" style={{ fontFamily: "'JetBrains Mono'", color: '#f0f0ff' }}>
          {formatMMSS(timeLeft)}
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden bg-white/10 mb-4">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${progressPercent}%`,
              background: 'linear-gradient(90deg, #a855f7, #00d4ff)',
            }}
          />
        </div>

        <div className="flex justify-center gap-3 mb-4">
          <button onClick={startTimer} className="btn-primary px-5 py-2" disabled={isRunning}>
            Start
          </button>
          <button onClick={pauseTimer} className="px-5 py-2 rounded-lg border border-white/20" disabled={!isRunning}>
            Pause
          </button>
          <button onClick={resetTimer} className="px-5 py-2 rounded-lg border border-white/20">
            Reset
          </button>
        </div>

        <div className="flex justify-center gap-6 text-sm" style={{ color: '#a1a1c4' }}>
          <span>Pomodoros: {pomodoroCount}</span>
          <span>Away Events: {awayEvents}</span>
        </div>
      </div>

      <TimerSettings
        settings={settings}
        onSave={updateSettings}
        selectedSound={selectedSound}
        onSoundChange={setSelectedSound}
      />

      <button
        onClick={onCompleteSession}
        className="px-6 py-3 rounded-xl font-semibold border border-red-400/40 text-red-400"
      >
        End Session
      </button>
    </div>
  );
}
