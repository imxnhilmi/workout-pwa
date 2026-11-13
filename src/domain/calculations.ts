import type { LoadMode, SetTag, WorkoutExerciseBlock } from '../types/workout';

export function computeTotalWeightKg(
  weightKg: number,
  loadMode: LoadMode,
  baseSledKg = 0
): number {
  if (loadMode === 'plate_per_side') {
    return Math.round((weightKg * 2 + baseSledKg) * 100) / 100;
  }
  if (loadMode === 'per_side_only') {
    return Math.round(weightKg * 2 * 100) / 100;
  }
  return weightKg;
}

export function createDefaultSetTags(workingSetCount: number): SetTag[] {
  if (workingSetCount <= 0) {
    return [];
  }
  if (workingSetCount >= 3) {
    return ['rir1', ...Array.from({ length: workingSetCount - 1 }, (): SetTag => 'fail')];
  }
  return Array.from({ length: workingSetCount }, (): SetTag => 'fail');
}

export function isReadyToProgress(
  block: Pick<WorkoutExerciseBlock, 'isUnilateral' | 'targetRepMax' | 'sets'>
): boolean {
  const workingSets = block.sets.filter(
    (s) => s.completed && s.tag !== 'warmup' && s.tag !== 'dropset'
  );

  if (workingSets.length === 0) {
    return false;
  }

  return workingSets.every((s) => {
    if (block.isUnilateral) {
      return (
        (s.repsLeft ?? 0) >= block.targetRepMax &&
        (s.repsRight ?? 0) >= block.targetRepMax
      );
    }
    return (s.reps ?? 0) >= block.targetRepMax;
  });
}

export function computeEffectiveLoadScore(
  weightKg: number,
  loadMode: LoadMode,
  baseSledKg = 0
): number {
  if (loadMode === 'assisted_bw') {
    return -weightKg;
  }
  return computeTotalWeightKg(weightKg, loadMode, baseSledKg);
}

export function estimateOneRepMax(
  weightKg: number,
  reps: number,
  loadMode: LoadMode,
  baseSledKg = 0
): number {
  if (reps <= 0) {
    return 0;
  }
  const effectiveWeight = computeEffectiveLoadScore(weightKg, loadMode, baseSledKg);
  if (reps === 1) {
    return effectiveWeight;
  }
  return Math.round(effectiveWeight * (1 + reps / 30) * 10) / 10;
}
