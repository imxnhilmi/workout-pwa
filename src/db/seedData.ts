import { computeTotalWeightKg, createDefaultSetTags } from '../domain/calculations';
import type {
  Exercise,
  WorkoutExerciseBlock,
  WorkoutSession,
  WorkoutSetLog,
  WorkoutTemplate,
} from '../types/workout';

const SEED_CREATED_AT = '2026-09-01T08:00:00.000Z';

export const INITIAL_EXERCISES: Exercise[] = [
  // Upper Body Exercises
  {
    id: 'incline-db-chest-press',
    name: 'Incline DB Chest Press',
    category: 'upper',
    loadMode: 'standard',
    isUnilateral: false,
    defaultWorkingSets: 2,
    targetRepMax: 8,
    defaultIncrementKg: 2.5,
    suggestedSwapIds: ['cable-chest-press', 'pec-fly-machine'],
    notes: 'Progressed from 17.5 kg',
    createdAt: SEED_CREATED_AT,
  },
  {
    id: 'cable-chest-press',
    name: 'Cable Chest Press',
    category: 'upper',
    loadMode: 'standard',
    isUnilateral: false,
    defaultWorkingSets: 3,
    targetRepMax: 8,
    defaultIncrementKg: 2.5,
    suggestedSwapIds: ['incline-db-chest-press', 'pec-fly-machine'],
    notes: 'Ready to increase weight',
    createdAt: SEED_CREATED_AT,
  },
  {
    id: 'pec-fly-machine',
    name: 'Pec Fly Machine',
    category: 'upper',
    loadMode: 'standard',
    isUnilateral: false,
    defaultWorkingSets: 3,
    targetRepMax: 8,
    defaultIncrementKg: 2.5,
    suggestedSwapIds: ['cable-chest-press', 'incline-db-chest-press'],
    notes: 'Progressed from 41 kg',
    createdAt: SEED_CREATED_AT,
  },
  {
    id: 't-bar-row',
    name: 'T-Bar Row',
    category: 'upper',
    loadMode: 'standard',
    isUnilateral: false,
    defaultWorkingSets: 2,
    targetRepMax: 8,
    defaultIncrementKg: 2.5,
    suggestedSwapIds: ['neutral-grip-row', 'wide-grip-row'],
    notes: 'Progressed from 35 kg',
    createdAt: SEED_CREATED_AT,
  },
  {
    id: 'neutral-grip-row',
    name: 'Neutral Grip Row (Plate-Loaded Machine)',
    category: 'upper',
    loadMode: 'standard',
    isUnilateral: false,
    defaultWorkingSets: 2,
    targetRepMax: 8,
    defaultIncrementKg: 2.5,
    suggestedSwapIds: ['t-bar-row', 'wide-grip-row'],
    notes: 'T-Bar Row alternative',
    createdAt: SEED_CREATED_AT,
  },
  {
    id: 'wide-grip-row',
    name: 'Wide Grip Row',
    category: 'upper',
    loadMode: 'standard',
    isUnilateral: false,
    defaultWorkingSets: 2,
    targetRepMax: 8,
    defaultIncrementKg: 2.25,
    suggestedSwapIds: ['t-bar-row', 'neutral-grip-row'],
    notes: 'Row alternative',
    createdAt: SEED_CREATED_AT,
  },
  {
    id: 'lat-pulldown',
    name: 'Lat Pulldown',
    category: 'upper',
    loadMode: 'standard',
    isUnilateral: false,
    defaultWorkingSets: 2,
    targetRepMax: 8,
    defaultIncrementKg: 2.5,
    suggestedSwapIds: ['assisted-pull-up-machine'],
    notes: 'Strict/Controlled; progressed from 45 kg',
    createdAt: SEED_CREATED_AT,
  },
  {
    id: 'assisted-pull-up-machine',
    name: 'Assisted Pull-Up Machine',
    category: 'upper',
    loadMode: 'assisted_bw',
    isUnilateral: false,
    defaultWorkingSets: 2,
    targetRepMax: 8,
    defaultIncrementKg: 2.25,
    suggestedSwapIds: ['lat-pulldown'],
    notes: 'Vertical pull secondary',
    createdAt: SEED_CREATED_AT,
  },
  {
    id: 'cable-shoulder-press',
    name: 'Cable Shoulder Press',
    category: 'upper',
    loadMode: 'standard',
    isUnilateral: false,
    defaultWorkingSets: 3,
    targetRepMax: 8,
    defaultIncrementKg: 2.25,
    suggestedSwapIds: ['incline-db-chest-press', 'unilateral-cable-lateral-raises'],
    notes: 'Progressed from 18 kg',
    createdAt: SEED_CREATED_AT,
  },
  {
    id: 'unilateral-cable-lateral-raises',
    name: 'Unilateral Cable Lateral Raises',
    category: 'upper',
    loadMode: 'standard',
    isUnilateral: true,
    defaultWorkingSets: 3,
    targetRepMax: 8,
    defaultIncrementKg: 1.25,
    suggestedSwapIds: ['cable-shoulder-press'],
    notes: 'L & R balanced; progressed from 4.5 kg',
    createdAt: SEED_CREATED_AT,
  },
  {
    id: 'tricep-pushdown-dual-cable',
    name: 'Tricep Pushdown (Dual Cable)',
    category: 'upper',
    loadMode: 'standard',
    isUnilateral: false,
    defaultWorkingSets: 3,
    targetRepMax: 8,
    defaultIncrementKg: 2.25,
    suggestedSwapIds: ['tricep-pushdown-single-cable', 'tricep-overhead-extensions'],
    notes: 'Straight bar; progressed from 18 kg',
    createdAt: SEED_CREATED_AT,
  },

  // Arms Exercises
  {
    id: 'tricep-pushdown-single-cable',
    name: 'Tricep Pushdown (Single Cable)',
    category: 'arms',
    loadMode: 'standard',
    isUnilateral: false,
    defaultWorkingSets: 3,
    targetRepMax: 8,
    defaultIncrementKg: 1.25,
    suggestedSwapIds: ['tricep-pushdown-dual-cable', 'tricep-overhead-extensions'],
    notes: 'Straight bar',
    createdAt: SEED_CREATED_AT,
  },
  {
    id: 'tricep-overhead-extensions',
    name: 'Tricep Overhead Extensions',
    category: 'arms',
    loadMode: 'standard',
    isUnilateral: false,
    defaultWorkingSets: 2,
    targetRepMax: 8,
    defaultIncrementKg: 1.25,
    suggestedSwapIds: ['tricep-pushdown-single-cable', 'tricep-pushdown-dual-cable'],
    notes: 'Cable; progressed from 10 kg',
    createdAt: SEED_CREATED_AT,
  },
  {
    id: 'cable-hammer-curls',
    name: 'Cable Hammer Curls',
    category: 'arms',
    loadMode: 'standard',
    isUnilateral: false,
    defaultWorkingSets: 3,
    targetRepMax: 8,
    defaultIncrementKg: 2.25,
    suggestedSwapIds: ['seated-db-alternating-curls', 'barbell-reverse-curls'],
    notes: 'Progressed from 11 kg',
    createdAt: SEED_CREATED_AT,
  },
  {
    id: 'seated-db-alternating-curls',
    name: 'Seated DB Alternating Curls',
    category: 'arms',
    loadMode: 'standard',
    isUnilateral: true,
    defaultWorkingSets: 3,
    targetRepMax: 8,
    defaultIncrementKg: 1.25,
    suggestedSwapIds: ['cable-hammer-curls', 'barbell-reverse-curls'],
    notes: 'Left-side start; resolved L/R deficit',
    createdAt: SEED_CREATED_AT,
  },
  {
    id: 'barbell-reverse-curls',
    name: 'Barbell Reverse Curls',
    category: 'arms',
    loadMode: 'standard',
    isUnilateral: false,
    defaultWorkingSets: 3,
    targetRepMax: 8,
    defaultIncrementKg: 1.25,
    suggestedSwapIds: ['cable-hammer-curls', 'seated-db-alternating-curls'],
    notes: 'Forearm/brachialis finisher',
    createdAt: SEED_CREATED_AT,
  },

  // Lower Body Exercises
  {
    id: 'free-weight-45-leg-press',
    name: 'Free-Weight 45° Leg Press',
    category: 'lower',
    loadMode: 'plate_per_side',
    baseSledKg: 67,
    isUnilateral: false,
    defaultWorkingSets: 3,
    targetRepMax: 8,
    defaultIncrementKg: 5,
    suggestedSwapIds: ['unilateral-machine-leg-press'],
    notes: '67 kg base sled; progressed from 40 kg/side',
    createdAt: SEED_CREATED_AT,
  },
  {
    id: 'unilateral-machine-leg-press',
    name: 'Unilateral Machine Leg Press',
    category: 'lower',
    loadMode: 'standard',
    isUnilateral: true,
    defaultWorkingSets: 2,
    targetRepMax: 8,
    defaultIncrementKg: 5,
    suggestedSwapIds: ['free-weight-45-leg-press'],
    notes: 'Left-side start',
    createdAt: SEED_CREATED_AT,
  },
  {
    id: 'seated-hamstring-curls',
    name: 'Seated Hamstring Curls',
    category: 'lower',
    loadMode: 'standard',
    isUnilateral: false,
    defaultWorkingSets: 3,
    targetRepMax: 8,
    defaultIncrementKg: 2.5,
    suggestedSwapIds: ['seated-hamstring-curls-heavy-stack'],
    notes: 'Secondary heavy stack PB: 68 kg x 8',
    createdAt: SEED_CREATED_AT,
  },
  {
    id: 'seated-hamstring-curls-heavy-stack',
    name: 'Seated Hamstring Curls (Heavy Stack)',
    category: 'lower',
    loadMode: 'standard',
    isUnilateral: false,
    defaultWorkingSets: 3,
    targetRepMax: 8,
    defaultIncrementKg: 4.5,
    suggestedSwapIds: ['seated-hamstring-curls'],
    notes: 'Heavy stack variant (68 kg PB)',
    createdAt: SEED_CREATED_AT,
  },
  {
    id: 'leg-extension',
    name: 'Leg Extension',
    category: 'lower',
    loadMode: 'standard',
    isUnilateral: false,
    defaultWorkingSets: 3,
    targetRepMax: 8,
    defaultIncrementKg: 2.5,
    suggestedSwapIds: ['leg-extension-heavy-stack'],
    notes: 'Secondary heavy stack PB: 68 kg x 8',
    createdAt: SEED_CREATED_AT,
  },
  {
    id: 'leg-extension-heavy-stack',
    name: 'Leg Extension (Heavy Stack)',
    category: 'lower',
    loadMode: 'standard',
    isUnilateral: false,
    defaultWorkingSets: 3,
    targetRepMax: 8,
    defaultIncrementKg: 4.5,
    suggestedSwapIds: ['leg-extension'],
    notes: 'Heavy stack variant (68 kg PB)',
    createdAt: SEED_CREATED_AT,
  },
  {
    id: 'hip-adductor',
    name: 'Hip Adductor (Adductors)',
    category: 'lower',
    loadMode: 'standard',
    isUnilateral: false,
    defaultWorkingSets: 3,
    targetRepMax: 8,
    defaultIncrementKg: 2.5,
    suggestedSwapIds: ['hip-abduction'],
    notes: 'Progressed from 36 kg',
    createdAt: SEED_CREATED_AT,
  },
  {
    id: 'hip-abduction',
    name: 'Hip Abduction (Abductors)',
    category: 'lower',
    loadMode: 'standard',
    isUnilateral: false,
    defaultWorkingSets: 3,
    targetRepMax: 8,
    defaultIncrementKg: 2.5,
    suggestedSwapIds: ['hip-adductor'],
    notes: 'Progressed from 70 kg',
    createdAt: SEED_CREATED_AT,
  },
  {
    id: 'calf-raises',
    name: 'Calf Raises',
    category: 'lower',
    loadMode: 'per_side_only',
    isUnilateral: false,
    defaultWorkingSets: 3,
    targetRepMax: 12,
    defaultIncrementKg: 2.5,
    suggestedSwapIds: [],
    notes: '2-sec pause at bottom stretch',
    createdAt: SEED_CREATED_AT,
  },
  {
    id: 'hip-extensions',
    name: 'Hip Extensions',
    category: 'lower',
    loadMode: 'standard',
    isUnilateral: false,
    defaultWorkingSets: 2,
    targetRepMax: 8,
    defaultIncrementKg: 2.5,
    suggestedSwapIds: [],
    notes: 'Lower back/glute-ham extension; progressed from 10 kg',
    createdAt: SEED_CREATED_AT,
  },
];

export const DEFAULT_TEMPLATES: WorkoutTemplate[] = [
  {
    id: 'upper',
    name: 'Upper',
    defaultExerciseIds: [
      'incline-db-chest-press',
      't-bar-row',
      'pec-fly-machine',
      'lat-pulldown',
      'tricep-pushdown-dual-cable',
      'unilateral-cable-lateral-raises',
    ],
  },
  {
    id: 'lower',
    name: 'Lower',
    defaultExerciseIds: [
      'free-weight-45-leg-press',
      'seated-hamstring-curls',
      'leg-extension',
      'hip-abduction',
      'hip-adductor',
      'calf-raises',
      'hip-extensions',
    ],
  },
  {
    id: 'arms',
    name: 'Arms',
    defaultExerciseIds: [
      'tricep-pushdown-dual-cable',
      'cable-hammer-curls',
      'tricep-overhead-extensions',
      'unilateral-cable-lateral-raises',
      'seated-db-alternating-curls',
      'barbell-reverse-curls',
    ],
  },
];

const exerciseById = new Map<string, Exercise>(
  INITIAL_EXERCISES.map((ex) => [ex.id, ex])
);

interface SeedSetInput {
  weightKg: number;
  reps?: number;
  repsLeft?: number;
  repsRight?: number;
}

function buildSeededBlock(
  sessionId: string,
  exerciseId: string,
  setInputs: SeedSetInput[]
): WorkoutExerciseBlock {
  const ex = exerciseById.get(exerciseId);
  if (!ex) {
    throw new Error(`Missing seeded exercise for id: ${exerciseId}`);
  }
  const tags = createDefaultSetTags(setInputs.length);
  const sets: WorkoutSetLog[] = setInputs.map((input, idx) => {
    const totalWeightKg =
      ex.loadMode === 'plate_per_side'
        ? computeTotalWeightKg(input.weightKg, ex.loadMode, ex.baseSledKg)
        : undefined;

    if (ex.isUnilateral) {
      const rL = input.repsLeft ?? input.reps ?? ex.targetRepMax;
      const rR = input.repsRight ?? input.reps ?? ex.targetRepMax;
      return {
        id: `${sessionId}-${exerciseId}-set-${idx + 1}`,
        setNumber: idx + 1,
        tag: tags[idx] ?? 'fail',
        weightKg: input.weightKg,
        totalWeightKg,
        repsLeft: rL,
        repsRight: rR,
        completed: true,
      };
    }

    return {
      id: `${sessionId}-${exerciseId}-set-${idx + 1}`,
      setNumber: idx + 1,
      tag: tags[idx] ?? 'fail',
      weightKg: input.weightKg,
      totalWeightKg,
      reps: input.reps ?? ex.targetRepMax,
      completed: true,
    };
  });

  return {
    id: `${sessionId}-block-${exerciseId}`,
    exerciseId: ex.id,
    exerciseName: ex.name,
    loadMode: ex.loadMode,
    baseSledKg: ex.baseSledKg,
    isUnilateral: ex.isUnilateral,
    targetRepMax: ex.targetRepMax,
    restSeconds: 120,
    sets,
    notes: ex.notes,
  };
}

export const INITIAL_SESSIONS: WorkoutSession[] = [
  // September 2026 Baseline Sessions
  {
    id: 'seed-session-2026-09-10-upper',
    templateId: 'upper',
    title: 'Upper Session',
    startedAt: '2026-09-10T09:00:00.000Z',
    completedAt: '2026-09-10T10:05:00.000Z',
    status: 'completed',
    sessionNotes: 'September baseline upper session',
    blocks: [
      buildSeededBlock('seed-session-2026-09-10-upper', 'incline-db-chest-press', [
        { weightKg: 17.5, reps: 8 },
        { weightKg: 17.5, reps: 7 },
      ]),
      buildSeededBlock('seed-session-2026-09-10-upper', 't-bar-row', [
        { weightKg: 35, reps: 8 },
        { weightKg: 35, reps: 8 },
      ]),
      buildSeededBlock('seed-session-2026-09-10-upper', 'pec-fly-machine', [
        { weightKg: 41, reps: 8 },
        { weightKg: 41, reps: 8 },
        { weightKg: 41, reps: 7 },
      ]),
      buildSeededBlock('seed-session-2026-09-10-upper', 'lat-pulldown', [
        { weightKg: 45, reps: 8 },
        { weightKg: 45, reps: 8 },
      ]),
      buildSeededBlock('seed-session-2026-09-10-upper', 'tricep-pushdown-dual-cable', [
        { weightKg: 18, reps: 8 },
        { weightKg: 18, reps: 8 },
        { weightKg: 18, reps: 8 },
      ]),
      buildSeededBlock('seed-session-2026-09-10-upper', 'unilateral-cable-lateral-raises', [
        { weightKg: 4.5, repsLeft: 8, repsRight: 8 },
        { weightKg: 4.5, repsLeft: 8, repsRight: 8 },
        { weightKg: 4.5, repsLeft: 7, repsRight: 7 },
      ]),
      buildSeededBlock('seed-session-2026-09-10-upper', 'cable-chest-press', [
        { weightKg: 40, reps: 8 },
        { weightKg: 40, reps: 8 },
        { weightKg: 40, reps: 7 },
      ]),
      buildSeededBlock('seed-session-2026-09-10-upper', 'neutral-grip-row', [
        { weightKg: 15, reps: 8 },
        { weightKg: 15, reps: 8 },
      ]),
      buildSeededBlock('seed-session-2026-09-10-upper', 'wide-grip-row', [
        { weightKg: 40.5, reps: 8 },
        { weightKg: 40.5, reps: 7 },
      ]),
      buildSeededBlock('seed-session-2026-09-10-upper', 'assisted-pull-up-machine', [
        { weightKg: 27.2, reps: 6 },
        { weightKg: 27.2, reps: 6 },
      ]),
      buildSeededBlock('seed-session-2026-09-10-upper', 'cable-shoulder-press', [
        { weightKg: 18, reps: 8 },
        { weightKg: 18, reps: 8 },
        { weightKg: 18, reps: 8 },
      ]),
    ],
  },
  {
    id: 'seed-session-2026-09-12-lower',
    templateId: 'lower',
    title: 'Lower Session',
    startedAt: '2026-09-12T09:00:00.000Z',
    completedAt: '2026-09-12T10:15:00.000Z',
    status: 'completed',
    sessionNotes: 'September baseline lower session',
    blocks: [
      buildSeededBlock('seed-session-2026-09-12-lower', 'free-weight-45-leg-press', [
        { weightKg: 40, reps: 8 },
        { weightKg: 40, reps: 8 },
        { weightKg: 40, reps: 8 },
      ]),
      buildSeededBlock('seed-session-2026-09-12-lower', 'seated-hamstring-curls', [
        { weightKg: 36, reps: 8 },
        { weightKg: 36, reps: 8 },
        { weightKg: 36, reps: 7 },
      ]),
      buildSeededBlock('seed-session-2026-09-12-lower', 'leg-extension', [
        { weightKg: 41, reps: 8 },
        { weightKg: 41, reps: 8 },
        { weightKg: 41, reps: 8 },
      ]),
      buildSeededBlock('seed-session-2026-09-12-lower', 'hip-abduction', [
        { weightKg: 70, reps: 8 },
        { weightKg: 70, reps: 8 },
        { weightKg: 70, reps: 7 },
      ]),
      buildSeededBlock('seed-session-2026-09-12-lower', 'hip-adductor', [
        { weightKg: 36, reps: 8 },
        { weightKg: 36, reps: 8 },
        { weightKg: 36, reps: 8 },
      ]),
      buildSeededBlock('seed-session-2026-09-12-lower', 'calf-raises', [
        { weightKg: 20, reps: 12 },
        { weightKg: 20, reps: 12 },
        { weightKg: 20, reps: 10 },
      ]),
      buildSeededBlock('seed-session-2026-09-12-lower', 'hip-extensions', [
        { weightKg: 10, reps: 8 },
        { weightKg: 10, reps: 8 },
      ]),
      buildSeededBlock('seed-session-2026-09-12-lower', 'unilateral-machine-leg-press', [
        { weightKg: 45, repsLeft: 8, repsRight: 8 },
        { weightKg: 45, repsLeft: 7, repsRight: 7 },
      ]),
      buildSeededBlock('seed-session-2026-09-12-lower', 'seated-hamstring-curls-heavy-stack', [
        { weightKg: 59, reps: 8 },
        { weightKg: 59, reps: 8 },
        { weightKg: 59, reps: 7 },
      ]),
      buildSeededBlock('seed-session-2026-09-12-lower', 'leg-extension-heavy-stack', [
        { weightKg: 59, reps: 8 },
        { weightKg: 59, reps: 8 },
        { weightKg: 59, reps: 8 },
      ]),
    ],
  },
  {
    id: 'seed-session-2026-09-14-arms',
    templateId: 'arms',
    title: 'Arms Session',
    startedAt: '2026-09-14T09:00:00.000Z',
    completedAt: '2026-09-14T10:00:00.000Z',
    status: 'completed',
    sessionNotes: 'September baseline arms session',
    blocks: [
      buildSeededBlock('seed-session-2026-09-14-arms', 'tricep-pushdown-single-cable', [
        { weightKg: 20.3, reps: 8 },
        { weightKg: 20.3, reps: 8 },
        { weightKg: 20.3, reps: 7 },
      ]),
      buildSeededBlock('seed-session-2026-09-14-arms', 'cable-hammer-curls', [
        { weightKg: 11, reps: 8 },
        { weightKg: 11, reps: 8 },
        { weightKg: 11, reps: 8 },
      ]),
      buildSeededBlock('seed-session-2026-09-14-arms', 'tricep-overhead-extensions', [
        { weightKg: 10, reps: 8 },
        { weightKg: 10, reps: 8 },
      ]),
      buildSeededBlock('seed-session-2026-09-14-arms', 'unilateral-cable-lateral-raises', [
        { weightKg: 4.5, repsLeft: 8, repsRight: 8 },
        { weightKg: 4.5, repsLeft: 8, repsRight: 8 },
        { weightKg: 4.5, repsLeft: 8, repsRight: 8 },
      ]),
      buildSeededBlock('seed-session-2026-09-14-arms', 'seated-db-alternating-curls', [
        { weightKg: 8, repsLeft: 7, repsRight: 8 },
        { weightKg: 8, repsLeft: 7, repsRight: 8 },
        { weightKg: 8, repsLeft: 6, repsRight: 7 },
      ]),
      buildSeededBlock('seed-session-2026-09-14-arms', 'barbell-reverse-curls', [
        { weightKg: 10, reps: 8 },
        { weightKg: 10, reps: 7 },
        { weightKg: 10, reps: 7 },
      ]),
    ],
  },

  // November 2026 Latest Personal Best Sessions
  {
    id: 'seed-session-2026-11-08-upper',
    templateId: 'upper',
    title: 'Upper Session',
    startedAt: '2026-11-08T09:00:00.000Z',
    completedAt: '2026-11-08T10:10:00.000Z',
    status: 'completed',
    sessionNotes: 'November upper progression & personal bests',
    blocks: [
      buildSeededBlock('seed-session-2026-11-08-upper', 'incline-db-chest-press', [
        { weightKg: 22.5, reps: 7 },
        { weightKg: 22.5, reps: 7 },
      ]),
      buildSeededBlock('seed-session-2026-11-08-upper', 't-bar-row', [
        { weightKg: 55, reps: 7 },
        { weightKg: 55, reps: 6 },
      ]),
      buildSeededBlock('seed-session-2026-11-08-upper', 'pec-fly-machine', [
        { weightKg: 63, reps: 8 },
        { weightKg: 63, reps: 8 },
        { weightKg: 63, reps: 6 },
      ]),
      buildSeededBlock('seed-session-2026-11-08-upper', 'lat-pulldown', [
        { weightKg: 59, reps: 8 },
        { weightKg: 59, reps: 7 },
      ]),
      buildSeededBlock('seed-session-2026-11-08-upper', 'tricep-pushdown-dual-cable', [
        { weightKg: 27, reps: 8 },
        { weightKg: 27, reps: 8 },
        { weightKg: 27, reps: 6 },
      ]),
      buildSeededBlock('seed-session-2026-11-08-upper', 'unilateral-cable-lateral-raises', [
        { weightKg: 6.8, repsLeft: 6, repsRight: 6 },
        { weightKg: 6.8, repsLeft: 6, repsRight: 6 },
        { weightKg: 6.8, repsLeft: 6, repsRight: 6 },
      ]),
      buildSeededBlock('seed-session-2026-11-08-upper', 'cable-chest-press', [
        { weightKg: 50, reps: 8 },
        { weightKg: 50, reps: 8 },
        { weightKg: 50, reps: 8 },
      ]),
      buildSeededBlock('seed-session-2026-11-08-upper', 'neutral-grip-row', [
        { weightKg: 20, reps: 8 },
        { weightKg: 20, reps: 8 },
      ]),
      buildSeededBlock('seed-session-2026-11-08-upper', 'wide-grip-row', [
        { weightKg: 47.3, reps: 7 },
        { weightKg: 47.3, reps: 7 },
      ]),
      buildSeededBlock('seed-session-2026-11-08-upper', 'assisted-pull-up-machine', [
        { weightKg: 20.4, reps: 6 },
        { weightKg: 20.4, reps: 6 },
      ]),
      buildSeededBlock('seed-session-2026-11-08-upper', 'cable-shoulder-press', [
        { weightKg: 36, reps: 8 },
        { weightKg: 36, reps: 7 },
        { weightKg: 36, reps: 6 },
      ]),
    ],
  },
  {
    id: 'seed-session-2026-11-10-lower',
    templateId: 'lower',
    title: 'Lower Session',
    startedAt: '2026-11-10T09:00:00.000Z',
    completedAt: '2026-11-10T10:15:00.000Z',
    status: 'completed',
    sessionNotes: 'November lower progression & personal bests',
    blocks: [
      buildSeededBlock('seed-session-2026-11-10-lower', 'free-weight-45-leg-press', [
        { weightKg: 65, reps: 8 },
        { weightKg: 65, reps: 8 },
        { weightKg: 65, reps: 8 },
      ]),
      buildSeededBlock('seed-session-2026-11-10-lower', 'seated-hamstring-curls', [
        { weightKg: 45, reps: 8 },
        { weightKg: 45, reps: 8 },
        { weightKg: 45, reps: 7 },
      ]),
      buildSeededBlock('seed-session-2026-11-10-lower', 'leg-extension', [
        { weightKg: 54, reps: 8 },
        { weightKg: 54, reps: 8 },
        { weightKg: 54, reps: 8 },
      ]),
      buildSeededBlock('seed-session-2026-11-10-lower', 'hip-abduction', [
        { weightKg: 77, reps: 8 },
        { weightKg: 77, reps: 8 },
        { weightKg: 77, reps: 8 },
      ]),
      buildSeededBlock('seed-session-2026-11-10-lower', 'hip-adductor', [
        { weightKg: 50, reps: 8 },
        { weightKg: 50, reps: 8 },
        { weightKg: 50, reps: 8 },
      ]),
      buildSeededBlock('seed-session-2026-11-10-lower', 'calf-raises', [
        { weightKg: 25, reps: 12 },
        { weightKg: 25, reps: 12 },
        { weightKg: 25, reps: 12 },
      ]),
      buildSeededBlock('seed-session-2026-11-10-lower', 'hip-extensions', [
        { weightKg: 15, reps: 8 },
        { weightKg: 15, reps: 8 },
      ]),
      buildSeededBlock('seed-session-2026-11-10-lower', 'unilateral-machine-leg-press', [
        { weightKg: 54, repsLeft: 8, repsRight: 8 },
        { weightKg: 45, repsLeft: 8, repsRight: 8 },
      ]),
      buildSeededBlock('seed-session-2026-11-10-lower', 'seated-hamstring-curls-heavy-stack', [
        { weightKg: 68, reps: 8 },
        { weightKg: 68, reps: 8 },
        { weightKg: 68, reps: 8 },
      ]),
      buildSeededBlock('seed-session-2026-11-10-lower', 'leg-extension-heavy-stack', [
        { weightKg: 68, reps: 8 },
        { weightKg: 68, reps: 8 },
        { weightKg: 68, reps: 8 },
      ]),
    ],
  },
  {
    id: 'seed-session-2026-11-12-arms',
    templateId: 'arms',
    title: 'Arms Session',
    startedAt: '2026-11-12T09:00:00.000Z',
    completedAt: '2026-11-12T10:00:00.000Z',
    status: 'completed',
    sessionNotes: 'November arms progression & personal bests',
    blocks: [
      buildSeededBlock('seed-session-2026-11-12-arms', 'tricep-pushdown-single-cable', [
        { weightKg: 25.3, reps: 8 },
        { weightKg: 25.3, reps: 8 },
        { weightKg: 25.3, reps: 8 },
      ]),
      buildSeededBlock('seed-session-2026-11-12-arms', 'cable-hammer-curls', [
        { weightKg: 22.5, reps: 8 },
        { weightKg: 22.5, reps: 8 },
        { weightKg: 22.5, reps: 7 },
      ]),
      buildSeededBlock('seed-session-2026-11-12-arms', 'tricep-overhead-extensions', [
        { weightKg: 15.8, reps: 7 },
        { weightKg: 15.8, reps: 7 },
      ]),
      buildSeededBlock('seed-session-2026-11-12-arms', 'unilateral-cable-lateral-raises', [
        { weightKg: 6.8, repsLeft: 6, repsRight: 6 },
        { weightKg: 6.8, repsLeft: 6, repsRight: 6 },
        { weightKg: 6.8, repsLeft: 6, repsRight: 6 },
      ]),
      buildSeededBlock('seed-session-2026-11-12-arms', 'seated-db-alternating-curls', [
        { weightKg: 10, repsLeft: 8, repsRight: 8 },
        { weightKg: 10, repsLeft: 8, repsRight: 8 },
        { weightKg: 10, repsLeft: 8, repsRight: 8 },
      ]),
      buildSeededBlock('seed-session-2026-11-12-arms', 'barbell-reverse-curls', [
        { weightKg: 12.5, reps: 8 },
        { weightKg: 10, reps: 8 },
        { weightKg: 10, reps: 8 },
      ]),
    ],
  },
];
