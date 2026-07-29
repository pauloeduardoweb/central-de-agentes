import React, { useEffect, useState, useRef } from 'react';
import { playTickSound } from '../../utils/soundEffects';
import { Clock, AlertTriangle } from 'lucide-react';

interface CircularCountdownTimerProps {
  initialSeconds?: number;
  isPaused: boolean;
  onTimeOut: () => void;
}

export const CircularCountdownTimer: React.FC<CircularCountdownTimerProps> = ({
  initialSeconds = 60,
  isPaused,
  onTimeOut,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const onTimeOutRef = useRef(onTimeOut);
  onTimeOutRef.current = onTimeOut;

  // Reset timer if initialSeconds changes
  useEffect(() => {
    setSecondsLeft(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (isPaused || secondsLeft <= 0) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        const next = prev - 1;

        // Play sound effects in last 10 seconds
        if (next <= 10 && next > 0) {
          playTickSound(next <= 5);
        }

        if (next <= 0) {
          clearInterval(interval);
          setTimeout(() => {
            onTimeOutRef.current();
          }, 50);
          return 0;
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, secondsLeft]);

  const percentage = (secondsLeft / initialSeconds) * 100;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Color dynamics based on time remaining
  const isRed = secondsLeft <= 5;
  const isYellow = secondsLeft <= 10 && secondsLeft > 5;
  const isPulsing = secondsLeft <= 3 && secondsLeft > 0;

  let strokeColor = 'stroke-cyan-400';
  let glowColor = 'shadow-[0_0_20px_rgba(34,211,238,0.5)]';
  let textColor = 'text-cyan-300';
  let badgeBg = 'bg-cyan-950/80 border-cyan-500/40 text-cyan-300';

  if (isRed) {
    strokeColor = 'stroke-rose-500';
    glowColor = 'shadow-[0_0_25px_rgba(244,63,94,0.8)]';
    textColor = 'text-rose-400';
    badgeBg = 'bg-rose-950/90 border-rose-500 text-rose-300';
  } else if (isYellow) {
    strokeColor = 'stroke-amber-400';
    glowColor = 'shadow-[0_0_20px_rgba(245,158,11,0.6)]';
    textColor = 'text-amber-300';
    badgeBg = 'bg-amber-950/90 border-amber-500/60 text-amber-300';
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-1">
      <div
        className={`relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center rounded-full bg-slate-900/90 border border-slate-800 backdrop-blur-md transition-all ${glowColor} ${
          isPulsing ? 'animate-pulse scale-105' : ''
        }`}
      >
        {/* Circular SVG Ring */}
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle track */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            className="stroke-slate-800/80"
            strokeWidth="8"
            fill="transparent"
          />
          {/* Animated progress circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            className={`${strokeColor} transition-all duration-500 ease-linear`}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        {/* Center Countdown Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Clock className={`w-3.5 h-3.5 mb-0.5 ${textColor} opacity-80`} />
          <span className={`text-base sm:text-lg font-black font-mono tracking-tight ${textColor}`}>
            {secondsLeft}s
          </span>
        </div>
      </div>

      {/* Label Badge */}
      <span
        className={`px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${badgeBg}`}
      >
        {secondsLeft <= 0 ? (
          <span className="flex items-center space-x-1 text-rose-400">
            <AlertTriangle className="w-3 h-3" />
            <span>TEMPO ESGOTADO</span>
          </span>
        ) : (
          `TEMPO DA MISSÃO`
        )}
      </span>
    </div>
  );
};
