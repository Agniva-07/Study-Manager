import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const MODES = {
  work: 'work',
  shortBreak: 'shortBreak',
  longBreak: 'longBreak',
};

const DEFAULT_SETTINGS = {
  workDuration: 25,
  shortBreak: 5,
  longBreak: 15,
};

function minutesToSeconds(minutes) {
  return Math.max(1, Number(minutes || 0)) * 60;
}

function getDurationByMode(mode, settings) {
  if (mode === MODES.work) return minutesToSeconds(settings.workDuration);
  if (mode === MODES.shortBreak) return minutesToSeconds(settings.shortBreak);
  return minutesToSeconds(settings.longBreak);
}

export default function usePomodoro(initialSettings = DEFAULT_SETTINGS) {
  const [settings, setSettings] = useState({
    ...DEFAULT_SETTINGS,
    ...initialSettings,
  });
  const [mode, setMode] = useState(MODES.work);
  const [timeLeft, setTimeLeft] = useState(() =>
    getDurationByMode(MODES.work, { ...DEFAULT_SETTINGS, ...initialSettings })
  );
  const [isRunning, setIsRunning] = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(0);

  const intervalRef = useRef(null);
  const endTimeRef = useRef(null);
  const sessionStartMsRef = useRef(Date.now());
  const totalWorkSecondsRef = useRef(0);
  const modeStartedAtRef = useRef(Date.now());
  const modeRef = useRef(MODES.work);
  const settingsRef = useRef({
    ...DEFAULT_SETTINGS,
    ...initialSettings,
  });

  const clearTimerInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const syncAccumulatedWork = useCallback(() => {
    if (modeRef.current !== MODES.work) return;
    const now = Date.now();
    const deltaSeconds = Math.floor((now - modeStartedAtRef.current) / 1000);
    if (deltaSeconds > 0) {
      totalWorkSecondsRef.current += deltaSeconds;
      modeStartedAtRef.current = now;
    }
  }, []);

  const pauseTimer = useCallback(() => {
    if (!isRunning) return;
    if (modeRef.current === MODES.work) {
      syncAccumulatedWork();
    }
    clearTimerInterval();
    endTimeRef.current = null;
    setIsRunning(false);
  }, [clearTimerInterval, isRunning, mode, syncAccumulatedWork]);

  const startTimer = useCallback(() => {
    if (isRunning) return;
    setIsRunning(true);
    const now = Date.now();
    modeStartedAtRef.current = now;
    endTimeRef.current = now + timeLeft * 1000;

    intervalRef.current = setInterval(() => {
      const diffSeconds = Math.max(
        0,
        Math.ceil((endTimeRef.current - Date.now()) / 1000)
      );
      setTimeLeft(diffSeconds);

      if (diffSeconds <= 0) {
        const transitionNow = Date.now();
        let nextMode = MODES.work;

        const currentMode = modeRef.current;
        if (currentMode === MODES.work) {
          syncAccumulatedWork();
          setPomodoroCount((prev) => {
            const nextCount = prev + 1;
            nextMode = nextCount % 4 === 0 ? MODES.longBreak : MODES.shortBreak;
            return nextCount;
          });
        } else {
          nextMode = MODES.work;
        }

        const nextDuration = getDurationByMode(nextMode, settingsRef.current);
        modeRef.current = nextMode;
        setMode(nextMode);
        setTimeLeft(nextDuration);
        modeStartedAtRef.current = transitionNow;
        endTimeRef.current = transitionNow + nextDuration * 1000;
      }
    }, 1000);
  }, [
    clearTimerInterval,
    isRunning,
    syncAccumulatedWork,
    timeLeft,
  ]);

  const resetTimer = useCallback(() => {
    clearTimerInterval();
    endTimeRef.current = null;
    setIsRunning(false);
    setMode(MODES.work);
    setPomodoroCount(0);
    setTimeLeft(getDurationByMode(MODES.work, settings));
    totalWorkSecondsRef.current = 0;
    sessionStartMsRef.current = Date.now();
    modeStartedAtRef.current = Date.now();
  }, [clearTimerInterval, settings]);

  const updateSettings = useCallback(
    (nextSettings) => {
      const merged = {
        ...settings,
        ...nextSettings,
      };
      settingsRef.current = merged;
      setSettings(merged);

      if (!isRunning) {
        setTimeLeft(getDurationByMode(mode, merged));
      }
    },
    [isRunning, mode, settings]
  );

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    setTimeLeft(getDurationByMode(mode, settings));
  }, [mode, settings]);

  useEffect(() => {
    return () => clearTimerInterval();
  }, [clearTimerInterval]);

  const totalElapsedSeconds = useMemo(
    () => Math.floor((Date.now() - sessionStartMsRef.current) / 1000),
    [pomodoroCount, mode, timeLeft, isRunning]
  );

  const totalWorkSeconds = useMemo(() => {
    if (isRunning && mode === MODES.work) {
      const runningDelta = Math.floor((Date.now() - modeStartedAtRef.current) / 1000);
      return totalWorkSecondsRef.current + Math.max(0, runningDelta);
    }
    return totalWorkSecondsRef.current;
  }, [isRunning, mode, pomodoroCount, timeLeft]);

  return {
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
    modeLabels: {
      [MODES.work]: 'Work',
      [MODES.shortBreak]: 'Short Break',
      [MODES.longBreak]: 'Long Break',
    },
  };
}
