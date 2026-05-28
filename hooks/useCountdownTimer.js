import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Countdown timer hook.
 *
 * Usage:
 *   const timer = useCountdownTimer();
 *   // When exam data loads:
 *   timer.start(durationSeconds, onExpireCallback);
 *   // Manually stop:
 *   timer.stop();
 *
 * Returns:
 *   { timeLeft, display, isWarning, isDanger, isExpired, running, start, stop, reset }
 */
export function useCountdownTimer() {
  const [timeLeft, setTimeLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const onExpireRef = useRef(null);

  useEffect(() => {
    if (!running || timeLeft <= 0) return;

    const id = setTimeout(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setRunning(false);
          onExpireRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearTimeout(id);
  }, [running, timeLeft]);

  /** Start (or resume) the timer. Optionally set a new duration and expiry callback. */
  const start = useCallback((seconds, onExpire) => {
    if (seconds != null) setTimeLeft(seconds);
    if (onExpire)        onExpireRef.current = onExpire;
    setRunning(true);
  }, []);

  /** Pause the timer without resetting the remaining time. */
  const stop = useCallback(() => setRunning(false), []);

  /** Reset to a new number of seconds and stop. */
  const reset = useCallback((seconds) => {
    setRunning(false);
    if (seconds != null) setTimeLeft(seconds);
  }, []);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return {
    timeLeft,
    display:   `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
    isWarning: timeLeft > 0 && timeLeft <= 300 && timeLeft > 60,  // 5 min → 1 min
    isDanger:  timeLeft > 0 && timeLeft <= 60,                     // last minute
    isExpired: timeLeft === 0 && !running,
    running,
    start,
    stop,
    reset,
  };
}
