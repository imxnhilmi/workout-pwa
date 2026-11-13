import type { LoadMode, WorkoutExerciseBlock, WorkoutSession, WorkoutSetLog } from '../types/workout';
import { computeTotalWeightKg } from './calculations';

interface WeightGroup {
  weightKg: number;
  sets: WorkoutSetLog[];
}

function formatWeightLabel(weightKg: number, loadMode: LoadMode, baseSledKg?: number): string {
  switch (loadMode) {
    case 'plate_per_side': {
      const totalKg = computeTotalWeightKg(weightKg, 'plate_per_side', baseSledKg);
      return `${weightKg} kg/side (${totalKg} kg total)`;
    }
    case 'per_side_only':
      return `${weightKg} kg/side`;
    case 'assisted_bw':
      return `BW - ${weightKg} kg`;
    case 'standard':
    default:
      return `${weightKg} kg`;
  }
}

function formatSetReps(set: WorkoutSetLog, isUnilateral: boolean): string {
  if (isUnilateral) {
    return `${set.repsLeft ?? 0}L/${set.repsRight ?? 0}R`;
  }
  return `${set.reps ?? 0}`;
}

export function formatExerciseBlockLine(block: WorkoutExerciseBlock): string {
  const completedWorkingSets = block.sets.filter((s) => s.completed && s.tag !== 'warmup');
  const includedSets =
    completedWorkingSets.length > 0
      ? completedWorkingSets
      : block.sets.filter((s) => s.tag !== 'warmup');

  if (includedSets.length === 0) {
    return `- ${block.exerciseName}: (no working sets)`;
  }

  const groups: WeightGroup[] = [];
  for (const set of includedSets) {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.weightKg === set.weightKg) {
      lastGroup.sets.push(set);
    } else {
      groups.push({ weightKg: set.weightKg, sets: [set] });
    }
  }

  const formattedGroups = groups.map((group) => {
    const weightStr = formatWeightLabel(group.weightKg, block.loadMode, block.baseSledKg);
    const repsStr = group.sets.map((s) => formatSetReps(s, block.isUnilateral)).join(', ');
    return `${weightStr} x ${repsStr}`;
  });

  const hasFail = includedSets.some((s) => s.tag === 'fail');
  const failSuffix = hasFail ? ' (fail)' : '';

  return `- ${block.exerciseName}: ${formattedGroups.join(' / ')}${failSuffix}`;
}

export function formatSessionAsText(session: WorkoutSession): string {
  const dateSource = session.completedAt ?? session.startedAt;
  const formattedDate = dateSource ? dateSource.slice(0, 10) : '';
  const header = formattedDate ? `${session.title} — ${formattedDate}` : session.title;

  const blockLines = session.blocks.map((block) => formatExerciseBlockLine(block));
  const lines = [header, ...blockLines];

  if (session.sessionNotes && session.sessionNotes.trim().length > 0) {
    lines.push('', `Notes: ${session.sessionNotes.trim()}`);
  }

  return lines.join('\n');
}
