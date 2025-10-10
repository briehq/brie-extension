import { useEffect, useState } from 'react';

export const useTypewriter = (
  text: string,
  { speed = 18, enabled = true }: { speed?: number; enabled?: boolean } = {},
) => {
  const [out, setOut] = useState('');
  useEffect(() => {
    if (!enabled || !text) {
      setOut('');
      return;
    }
    let i = 0;
    let cancelled = false;
    setOut('');
    const id = window.setInterval(() => {
      if (cancelled) return;
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) {
        window.clearInterval(id);
      }
    }, speed);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [text, enabled, speed]);
  return out;
};
