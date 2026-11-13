import React, { useEffect } from 'react';
import { Timer, Plus, Minus, X, RotateCcw } from 'lucide-react';

interface RestTimerBarProps {
  remainingSeconds: number | null;
  totalSeconds: number;
  exerciseName?: string;
  onUpdateRemaining: (newSeconds: number | null) => void;
  onSelectPreset: (presetSeconds: number) => void;
}

const PRESETS = [90, 120, 180];

export const RestTimerBar: React.FC<RestTimerBarProps> = ({
  remainingSeconds,
  totalSeconds,
  exerciseName,
  onUpdateRemaining,
  onSelectPreset,
}) => {
  useEffect(() => {
    if (remainingSeconds === null || remainingSeconds <= 0) {
      return;
    }
    const id = window.setInterval(() => {
      onUpdateRemaining(Math.max(0, remainingSeconds - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [remainingSeconds, onUpdateRemaining]);

  if (remainingSeconds === null) {
    return null;
  }

  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const formattedTime = `${mins}:${secs.toString().padStart(2, '0')}`;
  const pct = totalSeconds > 0 ? Math.min(100, Math.round(((totalSeconds - remainingSeconds) / totalSeconds) * 100)) : 100;
  const isDone = remainingSeconds === 0;

  return (
    <div
      className={`fixed bottom-20 left-3 right-3 z-40 mx-auto max-w-xl rounded-2xl border p-3.5 shadow-2xl backdrop-blur-md transition-all ${
        isDone
          ? 'border-emerald-500/80 bg-emerald-950/95 text-emerald-100'
          : 'border-zinc-700/80 bg-zinc-900/95 text-zinc-100'
      }`}
      role="region"
      aria-label="Rest Timer"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              isDone ? 'bg-emerald-500 text-zinc-950' : 'bg-emerald-500/20 text-emerald-400'
            }`}
          >
            <Timer className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold tracking-tight">
                {isDone ? 'REST COMPLETE!' : formattedTime}
              </span>
              {!isDone && (
                <span className="text-xs text-zinc-400">
                  / {totalSeconds}s
                </span>
              )}
            </div>
            {exerciseName && (
              <p className="truncate text-xs text-zinc-400">
                Next set: {exerciseName}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onUpdateRemaining(Math.max(0, remainingSeconds - 15))}
            className="flex min-h-[40px] items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 text-xs font-semibold text-zinc-200 active:bg-zinc-700"
            title="Subtract 15 seconds"
          >
            <Minus className="mr-0.5 h-3 w-3" />
            15s
          </button>
          <button
            type="button"
            onClick={() => onUpdateRemaining(remainingSeconds + 30)}
            className="flex min-h-[40px] items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 text-xs font-semibold text-zinc-200 active:bg-zinc-700"
            title="Add 30 seconds"
          >
            <Plus className="mr-0.5 h-3 w-3" />
            30s
          </button>
          <button
            type="button"
            onClick={() => onUpdateRemaining(null)}
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-white active:bg-zinc-700"
            aria-label="Skip rest timer"
            title="Dismiss timer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Presets row */}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
            Presets:
          </span>
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onSelectPreset(preset)}
              className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                totalSeconds === preset
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {preset}s
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onSelectPreset(totalSeconds)}
          className="flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-zinc-200"
        >
          <RotateCcw className="h-3 w-3" />
          Restart
        </button>
      </div>
    </div>
  );
};
