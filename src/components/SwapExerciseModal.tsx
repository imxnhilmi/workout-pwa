import React, { useState, useMemo } from 'react';
import { Search, X, ArrowLeftRight, PlusCircle, Sparkles, SplitSquareHorizontal } from 'lucide-react';
import type { ExerciseHistoryAndPB } from '../db/database';
import type { Exercise } from '../types/workout';

interface SwapExerciseModalProps {
  isOpen: boolean;
  mode?: 'swap' | 'add';
  currentExerciseName?: string;
  currentExerciseId?: string;
  initialUnilateral?: boolean;
  exercises: Exercise[];
  statsMap?: Record<string, ExerciseHistoryAndPB>;
  onClose: () => void;
  onSelectExercise: (targetQueryOrExerciseId: string, overrideUnilateral?: boolean) => Promise<void> | void;
}

export const SwapExerciseModal: React.FC<SwapExerciseModalProps> = ({
  isOpen,
  mode = 'swap',
  currentExerciseName,
  currentExerciseId,
  initialUnilateral = false,
  exercises,
  statsMap,
  onClose,
  onSelectExercise,
}) => {
  const [query, setQuery] = useState('');
  const [unilateralChoice, setUnilateralChoice] = useState<boolean | undefined>(undefined);

  const currentExercise = useMemo(
    () => exercises.find((e) => e.id === currentExerciseId),
    [exercises, currentExerciseId]
  );

  const suggestedExercises = useMemo(() => {
    if (!currentExercise) {
      return exercises.slice(0, 5);
    }
    const directSwaps = currentExercise.suggestedSwapIds
      .map((id) => exercises.find((e) => e.id === id))
      .filter((e): e is Exercise => Boolean(e));

    if (directSwaps.length >= 3) {
      return directSwaps;
    }

    const peerCategory = exercises.filter(
      (e) =>
        e.category === currentExercise.category &&
        e.id !== currentExercise.id &&
        !directSwaps.some((d) => d.id === e.id)
    );

    return [...directSwaps, ...peerCategory].slice(0, 6);
  }, [currentExercise, exercises]);

  const trimmedQuery = query.trim();

  const filteredExercises = useMemo(() => {
    if (!trimmedQuery) {
      return exercises;
    }
    const lower = trimmedQuery.toLowerCase();
    return exercises.filter(
      (e) =>
        e.name.toLowerCase().includes(lower) ||
        e.category.toLowerCase().includes(lower) ||
        (e.notes && e.notes.toLowerCase().includes(lower))
    );
  }, [exercises, trimmedQuery]);

  if (!isOpen) {
    return null;
  }

  const effectiveUnilateralPreview = unilateralChoice ?? initialUnilateral;

  const handleDismiss = () => {
    setQuery('');
    setUnilateralChoice(undefined);
    onClose();
  };

  const handleChoose = async (target: string, defaultUnilateral?: boolean) => {
    const finalUnilateral =
      unilateralChoice !== undefined ? unilateralChoice : defaultUnilateral;
    await onSelectExercise(target, finalUnilateral);
    setQuery('');
    setUnilateralChoice(undefined);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'swap' ? 'Swap Exercise' : 'Add Exercise'}
    >
      <div className="flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-3xl sm:rounded-2xl border border-zinc-800 bg-zinc-900 text-zinc-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3.5">
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold text-zinc-100">
              {mode === 'swap' ? (
                <>
                  <ArrowLeftRight className="h-4 w-4 text-emerald-400" />
                  <span>Swap Exercise</span>
                </>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4 text-emerald-400" />
                  <span>Add Exercise to Session</span>
                </>
              )}
            </h3>
            {currentExerciseName && mode === 'swap' && (
              <p className="text-xs text-zinc-400">
                Replacing <span className="font-medium text-zinc-200">{currentExerciseName}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-800/60 text-zinc-400 hover:text-white"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Search / Custom Exercise Input */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type or search exercise to swap..."
              autoFocus
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 py-3 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Unilateral / Bilateral Mode Override Option */}
          <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5">
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <SplitSquareHorizontal className="h-4 w-4 text-emerald-400" />
              <span>Rep Tracking Mode:</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setUnilateralChoice(false)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  !effectiveUnilateralPreview
                    ? 'bg-emerald-500 text-zinc-950'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Bilateral
              </button>
              <button
                type="button"
                onClick={() => setUnilateralChoice(true)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  effectiveUnilateralPreview
                    ? 'bg-emerald-500 text-zinc-950'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Unilateral L/R
              </button>
            </div>
          </div>

          {/* Custom On-the-Fly Option */}
          {trimmedQuery.length > 0 && (
            <button
              type="button"
              onClick={() => handleChoose(trimmedQuery, effectiveUnilateralPreview)}
              className="flex w-full items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-left text-sm font-semibold text-emerald-300 hover:bg-emerald-500/20 transition"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>Use &quot;{trimmedQuery}&quot;</span>
              </span>
              <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[11px] text-emerald-200">
                {effectiveUnilateralPreview ? 'Unilateral L/R' : 'Bilateral'}
              </span>
            </button>
          )}

          {/* Quick Suggestion Chips */}
          {suggestedExercises.length > 0 && !trimmedQuery && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Suggested Alternatives
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedExercises.map((sug) => {
                  const sugStats = statsMap?.[sug.id];
                  return (
                    <button
                      key={sug.id}
                      type="button"
                      onClick={() => handleChoose(sug.id, sug.isUnilateral)}
                      className="flex flex-col items-start rounded-xl border border-zinc-700 bg-zinc-800/90 px-3 py-2 text-left text-xs font-medium text-zinc-200 hover:border-emerald-500/60 hover:text-emerald-300 active:bg-zinc-700"
                    >
                      <span>{sug.name}</span>
                      {sugStats?.pbSummary && (
                        <span className="mt-0.5 font-mono text-[10px] text-emerald-400">
                          PB: {sugStats.pbSummary}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Exercise Library List */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Exercise Library ({filteredExercises.length})
            </p>
            <div className="space-y-1.5">
              {filteredExercises.map((ex) => {
                const exStats = statsMap?.[ex.id];
                const lastWeight = exStats?.lastBlock?.sets[0]?.weightKg;
                return (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => handleChoose(ex.id, ex.isUnilateral)}
                    className="flex w-full items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/60 px-3.5 py-2.5 text-left hover:border-zinc-700 hover:bg-zinc-800/60 transition"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="truncate text-sm font-medium text-zinc-100">
                        {ex.name}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
                        <span className="uppercase">{ex.category}</span>
                        <span>•</span>
                        <span>{ex.isUnilateral ? 'Unilateral L/R' : 'Bilateral'}</span>
                        {ex.loadMode === 'plate_per_side' && (
                          <>
                            <span>•</span>
                            <span>+{ex.baseSledKg ?? 67} kg sled</span>
                          </>
                        )}
                        {lastWeight !== undefined && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-zinc-300">
                              Last: {lastWeight} kg
                            </span>
                          </>
                        )}
                      </div>
                      {exStats?.pbSummary && (
                        <div className="mt-0.5 truncate font-mono text-[11px] text-emerald-400">
                          PB: {exStats.pbSummary}
                        </div>
                      )}
                    </div>
                    <span className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-300">
                      Select
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
