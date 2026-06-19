import { useEffect, useState } from 'react';

function formatRemaining(ms) {
  if (ms <= 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function CountdownTimer({ expiresAt, onExpire }) {
  const [remainingMs, setRemainingMs] = useState(() => new Date(expiresAt) - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = new Date(expiresAt) - Date.now();
      setRemainingMs(diff);
      if (diff <= 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const isUrgent = remainingMs < 60 * 1000;

  return (
    <span className={'countdown' + (isUrgent ? ' countdown-urgent' : '')}>
      {formatRemaining(remainingMs)}
    </span>
  );
}
