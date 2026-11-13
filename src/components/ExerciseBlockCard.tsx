import React, { useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  Award,
  Check,
  Flame,
  Minus,
  Plus,
  SplitSquareHorizontal,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { getExerciseHistoryAndPB, type ExerciseHistoryAndPB } from '../db/database';
import { computeTotalWeightKg, isReadyToProgress } from '../domain/calculations';
import type { SetTag, WorkoutExerciseBlock, WorkoutSetLog } from '../types/workout';

interface ExerciseBlockCardProps {
  block: WorkoutExerciseBlock;
  defaultIncrementKg?: number;
  onOpenSwap: (block: WorkoutExerciseBlock) => void;
  onToggleUnilateral: (blockId: string, nextUnilateral: boolean) => Promise<void> | void;
  onUpdateSet: (
    blockId: string,
    setId: string,
    patch: Partial<WorkoutSetLog>,
    triggerTimerSeconds?: number
  ) => Promise<void> | void;
  onAddSet: (blockId: string) => Promise<void> | void;
  onRemoveSet: (blockId: string, setId: string) => Promise<void> | void;
}

const INCREMENT_STEPS = [0.5, 1.25, 2.25, 2.5, 5];

const SET_TAG_OPTIONS: Array<{ value: SetTag; label: string }> = [
  { value: 'warmup', label: 'W' },
  { value: 'rir2', label: 'RIR 2' },
  { value: 'rir1', label: 'RIR 1' },
  { value: 'fail', label: 'Fail' },
  { value: 'dropset', label: 'Drop' },
];

export const ExerciseBlockCard: React.FC<ExerciseBlockCardProps> = ({
  block,
  defaultIncrementKg = 2.5,
  onOpenSwap,
  onToggleUnilateral,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
}) => {
  const [stepKg, setStepKg] = useState<number>(
    INCREMENT_STEPS.includes(defaultIncrementKg) ? defaultIncrementKg : 2.5
  );
  const [historyInfo, setHistoryInfo] = useState<ExerciseHistoryAndPB | null>(null);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;
    getExerciseHistoryAndPB(block.exerciseId)
      .then((info) => {
        if (mounted) {
          setHistoryInfo(info);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [block.exerciseId]);

  const currentReady = isReadyToProgress(block);
  const showReadyBadge = Boolean(historyInfo?.readyToProgress || currentReady);

  const clearDraftField = (setId: string, field: string) => {
    const key = `${setId}-${field}`;
    setDraftValues((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const getNumericInputValue = (setId: string, field: string, fallback: number): string | number => {
    const key = `${setId}-${field}`;
    return key in draftValues ? draftValues[key] : fallback;
  };

  const handleNumericInputChange = (
    setId: string,
    field: 'weightKg' | 'reps' | 'repsLeft' | 'repsRight',
    raw: string,
    isFloat: boolean
  ) => {
    const key = `${setId}-${field}`;
    setDraftValues((prev) => ({ ...prev, [key]: raw }));
    if (raw.trim() === '') {
      return;
    }
    const parsed = isFloat ? parseFloat(raw) : parseInt(raw, 10);
    if (!Number.isNaN(parsed)) {
      onUpdateSet(block.id, setId, { [field]: Math.max(0, parsed) });
    }
  };

  const handleNumericInputBlur = (
    setId: string,
    field: 'weightKg' | 'reps' | 'repsLeft' | 'repsRight'
  ) => {
    const key = `${setId}-${field}`;
    const raw = draftValues[key];
    clearDraftField(setId, field);
    if (raw !== undefined && raw.trim() === '') {
      onUpdateSet(block.id, setId, { [field]: 0 });
    }
  };

  const adjustWeight = (set: WorkoutSetLog, delta: number) => {
    clearDraftField(set.id, 'weightKg');
    const nextWeight = Math.max(0, Math.round((set.weightKg + delta) * 100) / 100);
    onUpdateSet(block.id, set.id, { weightKg: nextWeight });
  };

  const adjustReps = (
    set: WorkoutSetLog,
    field: 'reps' | 'repsLeft' | 'repsRight',
    delta: number
  ) => {
    clearDraftField(set.id, field);
    const currentVal = set[field] ?? block.targetRepMax;
    const nextVal = Math.max(0, currentVal + delta);
    onUpdateSet(block.id, set.id, { [field]: nextVal });
  };

  const handleToggleCompleted = (set: WorkoutSetLog) => {
    const nextCompleted = !set.completed;
    onUpdateSet(
      block.id,
      set.id,
      { completed: nextCompleted },
      nextCompleted ? block.restSeconds : undefined
    );
  };

  const weightUnitLabel =
    block.loadMode === 'plate_per_side' || block.loadMode === 'per_side_only'
      ? 'kg/side'
      : block.loadMode === 'assisted_bw'
        ? 'kg assist'
        : 'kg';

  return (
    <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/90 p-4 shadow-lg">
      {/* Card Header */}
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-zinc-800/80 pb-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-zinc-100">{block.exerciseName}</h3>
            {showReadyBadge && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                <TrendingUp className="h-3 w-3" />
                Ready to Progress
              </span>
            )}
            {block.isUnilateral && (
              <span className="inline-flex items-center rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                Start L
              </span>
            )}
          </div>

          {/* Inline PB & Notes */}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
            {historyInfo?.pbSummary ? (
              <span className="inline-flex items-center gap-1 font-mono text-zinc-300">
                <Award className="h-3.5 w-3.5 text-amber-400" />
                PB: {historyInfo.pbSummary}
              </span>
            ) : (
              <span className="text-zinc-500">No prior PB recorded</span>
            )}
            <span>• Target: {block.targetRepMax} reps</span>
            {block.notes && <span className="text-zinc-400">• {block.notes}</span>}
          </div>
        </div>

        {/* Action Buttons: Unilateral L/R Toggle & 1-Tap Swap */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-pressed={block.isUnilateral}
            onClick={() => onToggleUnilateral(block.id, !block.isUnilateral)}
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
              block.isUnilateral
                ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-300'
                : 'border-zinc-700 bg-zinc-800/80 text-zinc-300 hover:border-zinc-600'
            }`}
            title="Toggle between Bilateral and Unilateral Left/Right rep tracking"
          >
            <SplitSquareHorizontal className="h-3.5 w-3.5" />
            <span>Unilateral L/R</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenSwap(block)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:border-emerald-500/50 hover:text-emerald-300 active:bg-zinc-700"
          >
            <ArrowLeftRight className="h-3.5 w-3.5 text-emerald-400" />
            <span>Swap</span>
          </button>
        </div>
      </div>

      {/* Micro-Increment Step Selector */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
            Step:
          </span>
          {INCREMENT_STEPS.map((inc) => (
            <button
              key={inc}
              type="button"
              onClick={() => setStepKg(inc)}
              className={`rounded-lg px-2 py-1 text-xs font-mono font-semibold transition ${
                stepKg === inc
                  ? 'bg-emerald-500 text-zinc-950'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              +{inc}kg
            </button>
          ))}
        </div>

        {block.loadMode === 'plate_per_side' && (
          <span className="text-xs font-medium text-emerald-400">
            Base Sled: {block.baseSledKg ?? 67} kg
          </span>
        )}
        {block.loadMode === 'assisted_bw' && (
          <span className="text-xs font-medium text-sky-400">
            Assisted BW (lower offset = stronger)
          </span>
        )}
      </div>

      {/* Sets List */}
      <div className="mt-3 space-y-2.5">
        {block.sets.map((set) => {
          const totalSledWeight =
            block.loadMode === 'plate_per_side'
              ? computeTotalWeightKg(set.weightKg, 'plate_per_side', block.baseSledKg ?? 67)
              : undefined;

          const hasImbalance =
            block.isUnilateral &&
            set.repsLeft !== undefined &&
            set.repsRight !== undefined &&
            set.repsLeft !== set.repsRight;

          return (
            <div
              key={set.id}
              className={`rounded-xl border p-3 transition ${
                set.completed
                  ? 'border-emerald-500/40 bg-emerald-950/20'
                  : 'border-zinc-800 bg-zinc-950/60'
              }`}
            >
              {/* Top Row of Set: Set #, Tag Pills, Delete Set */}
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 font-mono text-xs font-bold text-zinc-300">
                    {set.setNumber}
                  </span>
                  <div className="flex flex-wrap items-center gap-1">
                    {SET_TAG_OPTIONS.map((tagOpt) => (
                      <button
                        key={tagOpt.value}
                        type="button"
                        onClick={() => onUpdateSet(block.id, set.id, { tag: tagOpt.value })}
                        className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition ${
                          set.tag === tagOpt.value
                            ? tagOpt.value === 'fail'
                              ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
                              : tagOpt.value === 'warmup'
                                ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                                : 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                            : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {tagOpt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {hasImbalance && (
                    <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                      L/R Imbalance ({set.repsLeft}L vs {set.repsRight}R)
                    </span>
                  )}
                  {block.sets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveSet(block.id, set.id)}
                      className="text-zinc-500 hover:text-rose-400 p-1"
                      aria-label={`Remove set ${set.setNumber}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Bottom Row of Set: Weight Controls, Reps Controls, Completion Check Button */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Weight Stepper */}
                <div className="flex flex-col">
                  <span className="mb-1 text-[11px] font-medium text-zinc-400">
                    Load ({weightUnitLabel})
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => adjustWeight(set, -stepKg)}
                      className="flex h-11 w-10 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-200 active:bg-zinc-700"
                      aria-label="Decrease weight"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      step="any"
                      value={getNumericInputValue(set.id, 'weightKg', set.weightKg)}
                      onChange={(e) =>
                        handleNumericInputChange(set.id, 'weightKg', e.target.value, true)
                      }
                      onBlur={() => handleNumericInputBlur(set.id, 'weightKg')}
                      className="h-11 w-20 rounded-xl border border-zinc-700 bg-zinc-900 text-center font-mono text-base font-bold text-zinc-100 focus:border-emerald-500 focus:outline-none"
                      aria-label={`Set ${set.setNumber} weight`}
                    />
                    <button
                      type="button"
                      onClick={() => adjustWeight(set, stepKg)}
                      className="flex h-11 w-10 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-200 active:bg-zinc-700"
                      aria-label="Increase weight"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  {totalSledWeight !== undefined && (
                    <span className="mt-1 font-mono text-[11px] font-semibold text-emerald-400">
                      = {totalSledWeight} kg total (incl. {block.baseSledKg ?? 67} kg sled)
                    </span>
                  )}
                  {block.loadMode === 'assisted_bw' && (
                    <span className="mt-1 font-mono text-[11px] text-sky-400">
                      BW - {set.weightKg} kg
                    </span>
                  )}
                </div>

                {/* Reps Stepper(s): Unilateral L/R vs Bilateral */}
                {block.isUnilateral ? (
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex flex-col">
                      <span className="mb-1 text-[11px] font-semibold text-amber-300">
                        L Reps
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => adjustReps(set, 'repsLeft', -1)}
                          className="flex h-11 w-9 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-200 active:bg-zinc-700"
                          aria-label="Decrease Left Reps"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <input
                          type="number"
                          value={getNumericInputValue(
                            set.id,
                            'repsLeft',
                            set.repsLeft ?? block.targetRepMax
                          )}
                          onChange={(e) =>
                            handleNumericInputChange(set.id, 'repsLeft', e.target.value, false)
                          }
                          onBlur={() => handleNumericInputBlur(set.id, 'repsLeft')}
                          className="h-11 w-14 rounded-xl border border-zinc-700 bg-zinc-900 text-center font-mono text-base font-bold text-zinc-100 focus:border-emerald-500 focus:outline-none"
                          aria-label={`Set ${set.setNumber} Left Reps`}
                        />
                        <button
                          type="button"
                          onClick={() => adjustReps(set, 'repsLeft', 1)}
                          className="flex h-11 w-9 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-200 active:bg-zinc-700"
                          aria-label="Increase Left Reps"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col">
                      <span className="mb-1 text-[11px] font-semibold text-emerald-300">
                        R Reps
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => adjustReps(set, 'repsRight', -1)}
                          className="flex h-11 w-9 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-200 active:bg-zinc-700"
                          aria-label="Decrease Right Reps"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <input
                          type="number"
                          value={getNumericInputValue(
                            set.id,
                            'repsRight',
                            set.repsRight ?? block.targetRepMax
                          )}
                          onChange={(e) =>
                            handleNumericInputChange(set.id, 'repsRight', e.target.value, false)
                          }
                          onBlur={() => handleNumericInputBlur(set.id, 'repsRight')}
                          className="h-11 w-14 rounded-xl border border-zinc-700 bg-zinc-900 text-center font-mono text-base font-bold text-zinc-100 focus:border-emerald-500 focus:outline-none"
                          aria-label={`Set ${set.setNumber} Right Reps`}
                        />
                        <button
                          type="button"
                          onClick={() => adjustReps(set, 'repsRight', 1)}
                          className="flex h-11 w-9 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-200 active:bg-zinc-700"
                          aria-label="Increase Right Reps"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <span className="mb-1 text-[11px] font-medium text-zinc-400">
                      Reps
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => adjustReps(set, 'reps', -1)}
                        className="flex h-11 w-10 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-200 active:bg-zinc-700"
                        aria-label="Decrease Reps"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        type="number"
                        value={getNumericInputValue(
                          set.id,
                          'reps',
                          set.reps ?? block.targetRepMax
                        )}
                        onChange={(e) =>
                          handleNumericInputChange(set.id, 'reps', e.target.value, false)
                        }
                        onBlur={() => handleNumericInputBlur(set.id, 'reps')}
                        className="h-11 w-16 rounded-xl border border-zinc-700 bg-zinc-900 text-center font-mono text-base font-bold text-zinc-100 focus:border-emerald-500 focus:outline-none"
                        aria-label={`Set ${set.setNumber} Reps`}
                      />
                      <button
                        type="button"
                        onClick={() => adjustReps(set, 'reps', 1)}
                        className="flex h-11 w-10 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-200 active:bg-zinc-700"
                        aria-label="Increase Reps"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Complete Set Button (>= 44px touch target) */}
                <div className="flex flex-col items-end">
                  <span className="mb-1 text-[11px] font-medium text-zinc-400">
                    Done
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleCompleted(set)}
                    className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border font-semibold transition ${
                      set.completed
                        ? 'border-emerald-400 bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-950/50'
                        : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-100'
                    }`}
                    aria-label={`Complete set ${set.setNumber}`}
                  >
                    {set.tag === 'fail' && set.completed ? (
                      <Flame className="h-5 w-5" />
                    ) : (
                      <Check className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Card Footer: + Add Set */}
      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onAddSet(block.id)}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:border-zinc-700 hover:text-white"
        >
          <Plus className="h-3.5 w-3.5 text-emerald-400" />
          <span>Add Set</span>
        </button>

        <span className="text-[11px] text-zinc-500">
          Rest timer: {block.restSeconds}s on set completion
        </span>
      </div>
    </div>
  );
};
