import Dexie, { type Table } from 'dexie';
import {
  computeEffectiveLoadScore,
  computeTotalWeightKg,
  createDefaultSetTags,
  estimateOneRepMax,
  isReadyToProgress,
} from '../domain/calculations';
import { formatExerciseBlockLine } from '../domain/textExport';
import type {
  Category,
  Exercise,
  WorkoutExerciseBlock,
  WorkoutSession,
  WorkoutSetLog,
  WorkoutTemplate,
} from '../types/workout';
import { DEFAULT_TEMPLATES, INITIAL_EXERCISES, INITIAL_SESSIONS } from './seedData';

export class WorkoutDatabase extends Dexie {
  exercises!: Table<Exercise, string>;
  templates!: Table<WorkoutTemplate, string>;
  sessions!: Table<WorkoutSession, string>;

  constructor() {
    super('GymWorkoutPWA');
    this.version(1).stores({
      exercises: 'id, name, category',
      templates: 'id',
      sessions: 'id, templateId, status, startedAt, completedAt',
    });
  }
}

export const db = new WorkoutDatabase();

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function slugifyExerciseId(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base ? `${base}-${Date.now().toString(36)}` : createId('exercise');
}

export async function ensureSeeded(): Promise<void> {
  const exerciseCount = await db.exercises.count();
  if (exerciseCount > 0) {
    return;
  }

  await db.transaction('rw', db.exercises, db.templates, db.sessions, async () => {
    const currentCount = await db.exercises.count();
    if (currentCount > 0) {
      return;
    }
    await db.exercises.bulkPut(INITIAL_EXERCISES);
    await db.templates.bulkPut(DEFAULT_TEMPLATES);
    await db.sessions.bulkPut(INITIAL_SESSIONS);
  });
}

export interface ExerciseHistoryPoint {
  date: string;
  sessionId: string;
  topWeightKg: number;
  estimated1RM: number;
  totalVolumeKg: number;
  block: WorkoutExerciseBlock;
}

export interface ExerciseHistoryAndPB {
  lastBlock?: WorkoutExerciseBlock;
  pbWeightKg?: number;
  pbSummary?: string;
  readyToProgress: boolean;
  historyPoints: ExerciseHistoryPoint[];
}

export async function getExerciseHistoryAndPB(
  exerciseId: string
): Promise<ExerciseHistoryAndPB> {
  const completedSessions = await db.sessions
    .where('status')
    .equals('completed')
    .toArray();

  completedSessions.sort((a, b) => {
    const dateA = a.completedAt ?? a.startedAt;
    const dateB = b.completedAt ?? b.startedAt;
    return dateA.localeCompare(dateB);
  });

  const historyPoints: ExerciseHistoryPoint[] = [];
  let bestScore = -Infinity;
  let pbWeightKg: number | undefined;
  let pbBlock: WorkoutExerciseBlock | undefined;

  for (const session of completedSessions) {
    for (const block of session.blocks) {
      if (block.exerciseId !== exerciseId) {
        continue;
      }

      const workingSets = block.sets.filter(
        (s) => s.completed && s.tag !== 'warmup'
      );
      const activeSets =
        workingSets.length > 0
          ? workingSets
          : block.sets.filter((s) => s.tag !== 'warmup');

      if (activeSets.length === 0) {
        continue;
      }

      let blockBestScore = -Infinity;
      let blockTopWeightKg = activeSets[0].weightKg;
      let blockMax1RM = 0;
      let blockVolumeKg = 0;

      for (const set of activeSets) {
        const score = computeEffectiveLoadScore(
          set.weightKg,
          block.loadMode,
          block.baseSledKg
        );
        if (score > blockBestScore) {
          blockBestScore = score;
          blockTopWeightKg = set.weightKg;
        }
        if (score > bestScore) {
          bestScore = score;
          pbWeightKg = set.weightKg;
          pbBlock = block;
        }

        const effectiveReps = block.isUnilateral
          ? Math.max(set.repsLeft ?? 0, set.repsRight ?? 0)
          : (set.reps ?? 0);

        const set1RM = estimateOneRepMax(
          set.weightKg,
          effectiveReps,
          block.loadMode,
          block.baseSledKg
        );
        if (set1RM > blockMax1RM) {
          blockMax1RM = set1RM;
        }

        const totalLoad = computeTotalWeightKg(
          set.weightKg,
          block.loadMode,
          block.baseSledKg
        );
        const avgReps = block.isUnilateral
          ? ((set.repsLeft ?? 0) + (set.repsRight ?? 0)) / 2
          : (set.reps ?? 0);
        blockVolumeKg += totalLoad * avgReps;
      }

      historyPoints.push({
        date: (session.completedAt ?? session.startedAt).slice(0, 10),
        sessionId: session.id,
        topWeightKg: blockTopWeightKg,
        estimated1RM: Math.round(blockMax1RM * 10) / 10,
        totalVolumeKg: Math.round(blockVolumeKg * 10) / 10,
        block,
      });
    }
  }

  const lastBlock =
    historyPoints.length > 0
      ? historyPoints[historyPoints.length - 1].block
      : undefined;

  const readyToProgress = lastBlock ? isReadyToProgress(lastBlock) : false;
  const pbSummary = pbBlock
    ? formatExerciseBlockLine(pbBlock).replace(/^- [^:]+:\s*/, '')
    : undefined;

  return {
    lastBlock,
    pbWeightKg,
    pbSummary,
    readyToProgress,
    historyPoints,
  };
}

async function buildExerciseBlock(
  exercise: Exercise,
  options?: {
    blockId?: string;
    overrideUnilateral?: boolean;
    swappedFromExerciseId?: string;
    fallbackSetCount?: number;
  }
): Promise<WorkoutExerciseBlock> {
  const { lastBlock } = await getExerciseHistoryAndPB(exercise.id);
  const isUnilateral = options?.overrideUnilateral ?? exercise.isUnilateral;
  const blockId = options?.blockId ?? createId('block');

  const templateSetsCount =
    lastBlock && lastBlock.sets.length > 0
      ? lastBlock.sets.length
      : (options?.fallbackSetCount ?? exercise.defaultWorkingSets);

  const defaultTags = createDefaultSetTags(templateSetsCount);

  const sets: WorkoutSetLog[] = Array.from(
    { length: templateSetsCount },
    (_, idx): WorkoutSetLog => {
      const prevSet = lastBlock?.sets[idx] ?? lastBlock?.sets[lastBlock.sets.length - 1];
      const weightKg = prevSet?.weightKg ?? 20;
      const totalWeightKg =
        exercise.loadMode === 'plate_per_side'
          ? computeTotalWeightKg(weightKg, exercise.loadMode, exercise.baseSledKg)
          : undefined;
      const tag = prevSet?.tag ?? defaultTags[idx] ?? 'fail';

      if (isUnilateral) {
        const defaultRep = prevSet?.reps ?? exercise.targetRepMax;
        return {
          id: createId('set'),
          setNumber: idx + 1,
          tag,
          weightKg,
          totalWeightKg,
          repsLeft: prevSet?.repsLeft ?? defaultRep,
          repsRight: prevSet?.repsRight ?? defaultRep,
          completed: false,
        };
      }

      const bilateralReps =
        prevSet?.reps ??
        (prevSet?.repsLeft !== undefined && prevSet?.repsRight !== undefined
          ? Math.min(prevSet.repsLeft, prevSet.repsRight)
          : exercise.targetRepMax);

      return {
        id: createId('set'),
        setNumber: idx + 1,
        tag,
        weightKg,
        totalWeightKg,
        reps: bilateralReps,
        completed: false,
      };
    }
  );

  return {
    id: blockId,
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    swappedFromExerciseId: options?.swappedFromExerciseId,
    loadMode: exercise.loadMode,
    baseSledKg: exercise.baseSledKg,
    isUnilateral,
    targetRepMax: exercise.targetRepMax,
    restSeconds: lastBlock?.restSeconds ?? 120,
    sets,
    notes: exercise.notes,
  };
}

export async function startSessionFromTemplate(
  templateId: 'upper' | 'lower' | 'arms' | 'custom'
): Promise<WorkoutSession> {
  await ensureSeeded();

  const titleMap: Record<'upper' | 'lower' | 'arms' | 'custom', string> = {
    upper: 'Upper Session',
    lower: 'Lower Session',
    arms: 'Arms Session',
    custom: 'Custom Session',
  };

  const blocks: WorkoutExerciseBlock[] = [];

  if (templateId !== 'custom') {
    const template = await db.templates.get(templateId);
    if (template) {
      for (const exerciseId of template.defaultExerciseIds) {
        const exercise = await db.exercises.get(exerciseId);
        if (exercise) {
          const block = await buildExerciseBlock(exercise);
          blocks.push(block);
        }
      }
    }
  }

  const session: WorkoutSession = {
    id: createId('session'),
    templateId,
    title: titleMap[templateId],
    startedAt: new Date().toISOString(),
    status: 'active',
    blocks,
  };

  await db.sessions.put(session);
  return session;
}

async function resolveOrCreateExercise(
  targetQueryOrExerciseId: string,
  fallbackCategory: Category,
  fallbackWorkingSets: number,
  overrideUnilateral?: boolean
): Promise<Exercise> {
  const trimmed = targetQueryOrExerciseId.trim();
  if (!trimmed) {
    throw new Error('Exercise name or ID cannot be empty');
  }

  const allExercises = await db.exercises.toArray();
  const lowerQuery = trimmed.toLowerCase();

  const existing =
    allExercises.find((ex) => ex.id === trimmed) ??
    allExercises.find((ex) => ex.id.toLowerCase() === lowerQuery) ??
    allExercises.find((ex) => ex.name.trim().toLowerCase() === lowerQuery);

  if (existing) {
    return existing;
  }

  const newExercise: Exercise = {
    id: slugifyExerciseId(trimmed),
    name: trimmed,
    category: fallbackCategory,
    loadMode: 'standard',
    isUnilateral: overrideUnilateral ?? false,
    defaultWorkingSets: fallbackWorkingSets,
    targetRepMax: 8,
    defaultIncrementKg: 2.5,
    suggestedSwapIds: [],
    createdAt: new Date().toISOString(),
  };

  await db.exercises.put(newExercise);
  return newExercise;
}

export async function swapExerciseInSessionBlock(
  sessionId: string,
  blockId: string,
  targetQueryOrExerciseId: string,
  overrideUnilateral?: boolean
): Promise<WorkoutSession> {
  const session = await db.sessions.get(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const blockIndex = session.blocks.findIndex((b) => b.id === blockId);
  if (blockIndex === -1) {
    throw new Error(`Exercise block not found: ${blockId}`);
  }

  const currentBlock = session.blocks[blockIndex];
  const fallbackCategory: Category =
    session.templateId === 'custom' ? 'upper' : session.templateId;
  const fallbackSetCount = currentBlock.sets.length > 0 ? currentBlock.sets.length : 3;

  const targetExercise = await resolveOrCreateExercise(
    targetQueryOrExerciseId,
    fallbackCategory,
    fallbackSetCount,
    overrideUnilateral
  );

  const replacementBlock = await buildExerciseBlock(targetExercise, {
    blockId: currentBlock.id,
    overrideUnilateral,
    swappedFromExerciseId:
      currentBlock.swappedFromExerciseId ?? currentBlock.exerciseId,
    fallbackSetCount,
  });

  const updatedBlocks = [...session.blocks];
  updatedBlocks[blockIndex] = replacementBlock;

  const updatedSession: WorkoutSession = {
    ...session,
    blocks: updatedBlocks,
  };

  await db.sessions.put(updatedSession);
  return updatedSession;
}

export async function setBlockUnilateralMode(
  sessionId: string,
  blockId: string,
  isUnilateral: boolean
): Promise<WorkoutSession> {
  const session = await db.sessions.get(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const blockIndex = session.blocks.findIndex((b) => b.id === blockId);
  if (blockIndex === -1) {
    throw new Error(`Exercise block not found: ${blockId}`);
  }

  const currentBlock = session.blocks[blockIndex];
  if (currentBlock.isUnilateral === isUnilateral) {
    return session;
  }

  const mappedSets: WorkoutSetLog[] = currentBlock.sets.map((set) => {
    if (isUnilateral) {
      const repVal =
        set.reps ?? set.repsLeft ?? set.repsRight ?? currentBlock.targetRepMax;
      const { reps: _omittedReps, ...rest } = set;
      return {
        ...rest,
        repsLeft: set.repsLeft ?? repVal,
        repsRight: set.repsRight ?? repVal,
      };
    } else {
      const left = set.repsLeft ?? set.reps ?? currentBlock.targetRepMax;
      const right = set.repsRight ?? set.reps ?? currentBlock.targetRepMax;
      const {
        repsLeft: _omittedLeft,
        repsRight: _omittedRight,
        ...rest
      } = set;
      return {
        ...rest,
        reps: Math.min(left, right),
      };
    }
  });

  const updatedBlock: WorkoutExerciseBlock = {
    ...currentBlock,
    isUnilateral,
    sets: mappedSets,
  };

  const updatedBlocks = [...session.blocks];
  updatedBlocks[blockIndex] = updatedBlock;

  const updatedSession: WorkoutSession = {
    ...session,
    blocks: updatedBlocks,
  };

  await db.sessions.put(updatedSession);
  return updatedSession;
}

export async function updateSetInBlock(
  sessionId: string,
  blockId: string,
  setId: string,
  patch: Partial<WorkoutSetLog>
): Promise<WorkoutSession> {
  const session = await db.sessions.get(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const blockIndex = session.blocks.findIndex((b) => b.id === blockId);
  if (blockIndex === -1) {
    throw new Error(`Exercise block not found: ${blockId}`);
  }

  const block = session.blocks[blockIndex];
  const updatedSets = block.sets.map((s) => {
    if (s.id !== setId) {
      return s;
    }
    const merged: WorkoutSetLog = { ...s, ...patch };
    if (block.loadMode === 'plate_per_side') {
      merged.totalWeightKg = computeTotalWeightKg(
        merged.weightKg,
        block.loadMode,
        block.baseSledKg
      );
    }
    return merged;
  });

  const updatedBlocks = [...session.blocks];
  updatedBlocks[blockIndex] = {
    ...block,
    sets: updatedSets,
  };

  const updatedSession: WorkoutSession = {
    ...session,
    blocks: updatedBlocks,
  };

  await db.sessions.put(updatedSession);
  return updatedSession;
}

export async function addSetToBlock(
  sessionId: string,
  blockId: string
): Promise<WorkoutSession> {
  const session = await db.sessions.get(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const blockIndex = session.blocks.findIndex((b) => b.id === blockId);
  if (blockIndex === -1) {
    throw new Error(`Exercise block not found: ${blockId}`);
  }

  const block = session.blocks[blockIndex];
  const lastSet = block.sets[block.sets.length - 1];
  const weightKg = lastSet?.weightKg ?? 20;
  const totalWeightKg =
    block.loadMode === 'plate_per_side'
      ? computeTotalWeightKg(weightKg, block.loadMode, block.baseSledKg)
      : undefined;

  const newSet: WorkoutSetLog = block.isUnilateral
    ? {
        id: createId('set'),
        setNumber: block.sets.length + 1,
        tag: 'fail',
        weightKg,
        totalWeightKg,
        repsLeft: lastSet?.repsLeft ?? block.targetRepMax,
        repsRight: lastSet?.repsRight ?? block.targetRepMax,
        completed: false,
      }
    : {
        id: createId('set'),
        setNumber: block.sets.length + 1,
        tag: 'fail',
        weightKg,
        totalWeightKg,
        reps: lastSet?.reps ?? block.targetRepMax,
        completed: false,
      };

  const updatedBlocks = [...session.blocks];
  updatedBlocks[blockIndex] = {
    ...block,
    sets: [...block.sets, newSet],
  };

  const updatedSession: WorkoutSession = {
    ...session,
    blocks: updatedBlocks,
  };

  await db.sessions.put(updatedSession);
  return updatedSession;
}

export async function removeSetFromBlock(
  sessionId: string,
  blockId: string,
  setId: string
): Promise<WorkoutSession> {
  const session = await db.sessions.get(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const blockIndex = session.blocks.findIndex((b) => b.id === blockId);
  if (blockIndex === -1) {
    throw new Error(`Exercise block not found: ${blockId}`);
  }

  const block = session.blocks[blockIndex];
  const filteredSets = block.sets
    .filter((s) => s.id !== setId)
    .map((s, idx) => ({ ...s, setNumber: idx + 1 }));

  const updatedBlocks = [...session.blocks];
  updatedBlocks[blockIndex] = {
    ...block,
    sets: filteredSets,
  };

  const updatedSession: WorkoutSession = {
    ...session,
    blocks: updatedBlocks,
  };

  await db.sessions.put(updatedSession);
  return updatedSession;
}

export async function addExerciseBlockToSession(
  sessionId: string,
  targetQueryOrExerciseId: string,
  overrideUnilateral?: boolean
): Promise<WorkoutSession> {
  const session = await db.sessions.get(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const fallbackCategory: Category =
    session.templateId === 'custom' ? 'upper' : session.templateId;

  const exercise = await resolveOrCreateExercise(
    targetQueryOrExerciseId,
    fallbackCategory,
    3,
    overrideUnilateral
  );

  const newBlock = await buildExerciseBlock(exercise, {
    overrideUnilateral,
  });

  const updatedSession: WorkoutSession = {
    ...session,
    blocks: [...session.blocks, newBlock],
  };

  await db.sessions.put(updatedSession);
  return updatedSession;
}

export async function completeWorkoutSession(
  sessionId: string,
  sessionNotes?: string
): Promise<WorkoutSession> {
  const session = await db.sessions.get(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const updatedSession: WorkoutSession = {
    ...session,
    status: 'completed',
    completedAt: new Date().toISOString(),
    sessionNotes: sessionNotes !== undefined ? sessionNotes : session.sessionNotes,
  };

  await db.sessions.put(updatedSession);
  return updatedSession;
}
