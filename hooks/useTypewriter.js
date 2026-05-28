import { useState, useEffect, useRef } from 'react';

/**
 * Simulates an AI typing effect.
 * @param {string} text - Full text to type out
 * @param {number} speed - Milliseconds per character (default 18ms)
 * @param {boolean} active - Start/stop typing
 * @returns {string} Currently displayed text
 */
export function useTypewriter(text = '', speed = 18, active = false) {
  const [displayed, setDisplayed] = useState('');
  const indexRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!active) {
      clearInterval(timerRef.current);
      setDisplayed('');
      indexRef.current = 0;
      return;
    }

    indexRef.current = 0;
    setDisplayed('');

    timerRef.current = setInterval(() => {
      if (indexRef.current >= text.length) {
        clearInterval(timerRef.current);
        return;
      }
      const char = text[indexRef.current];
      setDisplayed(prev => prev + char);
      indexRef.current += 1;
    }, speed);

    return () => clearInterval(timerRef.current);
  }, [text, active]);

  const isDone = displayed.length === text.length && text.length > 0;

  return { displayed, isDone };
}
