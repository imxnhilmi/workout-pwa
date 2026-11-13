import React, { useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Dumbbell,
  Play,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  addExerciseBlockToSession,
  addSetToBlock,
  completeWorkoutSession,
  db,
  removeSetFromBlock,
  setBlockUnilateralMode,
  startSessionFromTemplate,
  swapExerciseInSessionBlock,
  updateSetInBlock,
} from '../db/database';
import { formatSessionAsText } from '../domain/textExport';
import type {
  Exercise,
  WorkoutExerciseBlock,
  WorkoutSession,
  WorkoutSetLog,
  WorkoutTemplate,
} from '../types/workout';
import { ExerciseBlockCard } from './ExerciseBlockCard';
import { RestTimerBar } from './RestTimerBar';
import { SwapExerciseModal } from './SwapExerciseModal';

interface ActiveWorkoutViewProps {
  activeSession: WorkoutSession | undefined;
  exercises: Exercise[];
  templates: WorkoutTemplate[];
  onSessionUpdated: () => Promise<void> | void;
}

export const ActiveWorkoutView: React.FC<ActiveWorkoutViewProps> = ({
  activeSession,
  exercises,
  templates,
  onSessionUpdated,
}) => {
  const [swapModalState, setSwapModalState] = useState<{
    isOpen: boolean;
    mode: 'swap' | 'add';
    block?: WorkoutExerciseBlock;
  }>({ isOpen: false, mode: 'swap' });

  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);
  const [timerTotal, setTimerTotal] = useState<number>(120);
  const [timerExerciseName, setTimerExerciseName] = useState<string | undefined>(undefined);

  const [sessionNotes, setSessionNotes] = useState<string>('');
  const [recentlyCompleted, setRecentlyCompleted] = useState<WorkoutSession | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const exerciseMap = new Map(exercises.map((e) => [e.id, e]));

  const handleStartTemplate = async (templateId: 'upper' | 'lower' | 'arms' | 'custom') => {
    setRecentlyCompleted(null);
    setSessionNotes('');
    await startSessionFromTemplate(templateId);
    await onSessionUpdated();
  };

  const handleToggleUnilateral = async (blockId: string, nextUnilateral: boolean) => {
    if (!activeSession) return;
    await setBlockUnilateralMode(activeSession.id, blockId, nextUnilateral);
    await onSessionUpdated();
  };

  const handleUpdateSet = async (
    blockId: string,
    setId: string,
    patch: Partial<WorkoutSetLog>,
    triggerTimerSeconds?: number
  ) => {
    if (!activeSession) return;
    const block = activeSession.blocks.find((b) => b.id === blockId);
    await updateSetInBlock(activeSession.id, blockId, setId, patch);
    if (triggerTimerSeconds !== undefined) {
      setTimerTotal(triggerTimerSeconds);
      setTimerRemaining(triggerTimerSeconds);
      setTimerExerciseName(block?.exerciseName);
    }
    await onSessionUpdated();
  };

  const handleAddSet = async (blockId: string) => {
    if (!activeSession) return;
    await addSetToBlock(activeSession.id, blockId);
    await onSessionUpdated();
  };

  const handleRemoveSet = async (blockId: string, setId: string) => {
    if (!activeSession) return;
    await removeSetFromBlock(activeSession.id, blockId, setId);
    await onSessionUpdated();
  };

  const handleSelectSwapOrAdd = async (
    targetQueryOrExerciseId: string,
    overrideUnilateral?: boolean
  ) => {
    if (!activeSession) return;
    if (swapModalState.mode === 'swap' && swapModalState.block) {
      await swapExerciseInSessionBlock(
        activeSession.id,
        swapModalState.block.id,
        targetQueryOrExerciseId,
        overrideUnilateral
      );
    } else {
      await addExerciseBlockToSession(
        activeSession.id,
        targetQueryOrExerciseId,
        overrideUnilateral
      );
    }
    await onSessionUpdated();
  };

  const handleCompleteWorkout = async () => {
    if (!activeSession) return;
    const completed = await completeWorkoutSession(
      activeSession.id,
      sessionNotes.trim() || undefined
    );
    setTimerRemaining(null);
    setRecentlyCompleted(completed);
    await onSessionUpdated();
  };

  const handleDiscardWorkout = async () => {
    if (!activeSession) return;
    await db.sessions.delete(activeSession.id);
    setTimerRemaining(null);
    await onSessionUpdated();
  };

  const handleCopyText = async (session: WorkoutSession) => {
    const text = formatSessionAsText(session);
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    }
    setCopiedId(session.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Template Launcher when no active workout
  if (!activeSession) {
    const upperTemplate = templates.find((t) => t.id === 'upper');
    const lowerTemplate = templates.find((t) => t.id === 'lower');
    const armsTemplate = templates.find((t) => t.id === 'arms');

    const templateCards: Array<{
      id: 'upper' | 'lower' | 'arms';
      buttonLabel: string;
      subtitle: string;
      accent: string;
      exerciseIds: string[];
    }> = [
      {
        id: 'upper',
        buttonLabel: 'Start Upper Session',
        subtitle: 'Chest, Back, Shoulders & Triceps (6 core movements)',
        accent: 'border-emerald-500/40 hover:border-emerald-500',
        exerciseIds: upperTemplate?.defaultExerciseIds ?? [],
      },
      {
        id: 'lower',
        buttonLabel: 'Start Lower Session',
        subtitle: 'Quads, Hamstrings, Adductors/Abductors, Calves & Lower Back (7 movements)',
        accent: 'border-sky-500/40 hover:border-sky-500',
        exerciseIds: lowerTemplate?.defaultExerciseIds ?? [],
      },
      {
        id: 'arms',
        buttonLabel: 'Start Arms Session',
        subtitle: 'Triceps, Biceps, Forearms & Lateral Delts (6 movements)',
        accent: 'border-amber-500/40 hover:border-amber-500',
        exerciseIds: armsTemplate?.defaultExerciseIds ?? [],
      },
    ];

    return (
      <div className="space-y-6 pb-24">
        {/* Completed Workout Summary Banner */}
        {recentlyCompleted && (
          <div className="rounded-2xl border border-emerald-500/50 bg-emerald-950/30 p-4 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
                <h3 className="text-base font-bold">
                  {recentlyCompleted.title} Saved!
                </h3>
              </div>
              <button
                type="button"
                onClick={() => handleCopyText(recentlyCompleted)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-bold text-zinc-950 hover:bg-emerald-400"
              >
                {copiedId === recentlyCompleted.id ? (
                  <>
                    <ClipboardCheck className="h-4 w-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy as Text Log</span>
                  </>
                )}
              </button>
            </div>
            <pre className="mt-3 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-200 whitespace-pre-wrap">
              {formatSessionAsText(recentlyCompleted)}
            </pre>
          </div>
        )}

        {/* Intro Header */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <Dumbbell className="h-5 w-5" />
            <h2 className="text-lg font-bold text-zinc-100">Choose Your Split</h2>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Pre-filled with your latest working weights &amp; rep targets. Swap any machine on the fly or toggle Bilateral / Unilateral L/R tracking mid-workout.
          </p>
        </div>

        {/* Split Template Cards */}
        <div className="grid gap-4">
          {templateCards.map((card) => (
            <div
              key={card.id}
              className={`rounded-2xl border bg-zinc-900/90 p-4 transition ${card.accent}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-zinc-100 uppercase tracking-wide">
                    {card.id} Split
                  </h3>
                  <p className="text-xs text-zinc-400">{card.subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleStartTemplate(card.id)}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-zinc-950 shadow-md hover:bg-emerald-400 active:scale-[0.99]"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>{card.buttonLabel}</span>
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {card.exerciseIds.map((exId, idx) => {
                  const ex = exerciseMap.get(exId);
                  if (!ex) return null;
                  return (
                    <span
                      key={exId}
                      className="inline-flex items-center rounded-lg border border-zinc-800 bg-zinc-950/80 px-2.5 py-1 text-xs text-zinc-300"
                    >
                      {idx + 1}. {ex.name}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Blank / Custom Session Card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-200">
                  Freestyle / Custom Session
                </h3>
                <p className="text-xs text-zinc-400">
                  Start with an empty log and add any exercises as you go.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleStartTemplate('custom')}
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-bold text-zinc-100 hover:border-emerald-500/50"
              >
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span>Start Custom / Blank Session</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active Session View
  const totalSets = activeSession.blocks.reduce((acc, b) => acc + b.sets.length, 0);
  const completedSets = activeSession.blocks.reduce(
    (acc, b) => acc + b.sets.filter((s) => s.completed).length,
    0
  );

  return (
    <div className="space-y-4 pb-36">
      {/* Active Session Sticky Top Summary */}
      <div className="rounded-2xl border border-emerald-500/40 bg-zinc-900/95 p-4 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-lg font-bold text-zinc-100">{activeSession.title}</h2>
            </div>
            <p className="text-xs text-zinc-400">
              Completed Sets:{' '}
              <span className="font-mono font-semibold text-emerald-400">
                {completedSets} / {totalSets}
              </span>{' '}
              • Started {activeSession.startedAt.slice(0, 10)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDiscardWorkout}
              className="inline-flex min-h-[42px] items-center gap-1 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-rose-400"
              title="Discard active session"
            >
              <Trash2 className="h-4 w-4" />
              <span>Discard</span>
            </button>

            <button
              type="button"
              onClick={handleCompleteWorkout}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-zinc-950 shadow-md hover:bg-emerald-400"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Complete Workout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Exercise Block Cards */}
      <div className="space-y-4">
        {activeSession.blocks.map((block) => {
          const ex = exerciseMap.get(block.exerciseId);
          return (
            <ExerciseBlockCard
              key={block.id}
              block={block}
              defaultIncrementKg={ex?.defaultIncrementKg ?? 2.5}
              onOpenSwap={(targetBlock) =>
                setSwapModalState({ isOpen: true, mode: 'swap', block: targetBlock })
              }
              onToggleUnilateral={handleToggleUnilateral}
              onUpdateSet={handleUpdateSet}
              onAddSet={handleAddSet}
              onRemoveSet={handleRemoveSet}
            />
          );
        })}
      </div>

      {/* Add Exercise Button & Session Notes */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
        <button
          type="button"
          onClick={() => setSwapModalState({ isOpen: true, mode: 'add' })}
          className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 bg-zinc-950/60 py-3 text-sm font-semibold text-emerald-400 hover:border-emerald-500/60 hover:bg-zinc-900"
        >
          <Plus className="h-4 w-4" />
          <span>Add Exercise to Session</span>
        </button>

        <div>
          <label
            htmlFor="session-notes-input"
            className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5"
          >
            Session Notes (optional)
          </label>
          <textarea
            id="session-notes-input"
            rows={2}
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            placeholder="E.g. Busy cable crossover today, felt strong on rows..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-200 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Swap / Add Exercise Combobox Modal */}
      <SwapExerciseModal
        isOpen={swapModalState.isOpen}
        mode={swapModalState.mode}
        currentExerciseName={swapModalState.block?.exerciseName}
        currentExerciseId={swapModalState.block?.exerciseId}
        initialUnilateral={swapModalState.block?.isUnilateral ?? false}
        exercises={exercises}
        onClose={() => setSwapModalState({ isOpen: false, mode: 'swap' })}
        onSelectExercise={handleSelectSwapOrAdd}
      />

      {/* Floating Auto-Starting Rest Timer Bar */}
      <RestTimerBar
        remainingSeconds={timerRemaining}
        totalSeconds={timerTotal}
        exerciseName={timerExerciseName}
        onUpdateRemaining={setTimerRemaining}
        onSelectPreset={(preset) => {
          setTimerTotal(preset);
          setTimerRemaining(preset);
        }}
      />
    </div>
  );
};
