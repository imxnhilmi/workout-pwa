import { describe, expect, it } from 'vitest';
import { formatExerciseBlockLine, formatSessionAsText } from '../textExport';

describe('Plain-text note log exporter', () => {
  it('formats standard bilateral, plate_per_side leg press, assisted_bw, and unilateral sets', () => {
    expect(
      formatExerciseBlockLine({
        id: 'b1',
        exerciseId: 'leg-press',
        exerciseName: 'Free-Weight 45° Leg Press',
        loadMode: 'plate_per_side',
        baseSledKg: 67,
        isUnilateral: false,
        targetRepMax: 8,
        restSeconds: 180,
        sets: [
          { id: 's1', setNumber: 1, tag: 'rir1', weightKg: 65, reps: 8, completed: true },
          { id: 's2', setNumber: 2, tag: 'fail', weightKg: 65, reps: 8, completed: true },
          { id: 's3', setNumber: 3, tag: 'fail', weightKg: 65, reps: 8, completed: true },
        ],
      })
    ).toBe('- Free-Weight 45° Leg Press: 65 kg/side (197 kg total) x 8, 8, 8 (fail)');

    expect(
      formatExerciseBlockLine({
        id: 'b2',
        exerciseId: 'lat-raise',
        exerciseName: 'Unilateral Cable Lateral Raises',
        loadMode: 'standard',
        isUnilateral: true,
        targetRepMax: 8,
        restSeconds: 90,
        sets: [
          { id: 's1', setNumber: 1, tag: 'rir1', weightKg: 6.8, repsLeft: 6, repsRight: 6, completed: true },
          { id: 's2', setNumber: 2, tag: 'fail', weightKg: 6.8, repsLeft: 6, repsRight: 6, completed: true },
        ],
      })
    ).toBe('- Unilateral Cable Lateral Raises: 6.8 kg x 6L/6R, 6L/6R (fail)');

    expect(
      formatExerciseBlockLine({
        id: 'b4',
        exerciseId: 'assisted-dips',
        exerciseName: 'Assisted Tricep Dips',
        loadMode: 'assisted_bw',
        isUnilateral: false,
        targetRepMax: 8,
        restSeconds: 120,
        sets: [
          { id: 's1', setNumber: 1, tag: 'rir1', weightKg: 20.4, reps: 8, completed: true },
          { id: 's2', setNumber: 2, tag: 'fail', weightKg: 20.4, reps: 8, completed: true },
        ],
      })
    ).toBe('- Assisted Tricep Dips: BW - 20.4 kg x 8, 8 (fail)');

    expect(
      formatExerciseBlockLine({
        id: 'b5',
        exerciseId: 'calf-raises',
        exerciseName: 'Seated Calf Raises',
        loadMode: 'per_side_only',
        isUnilateral: false,
        targetRepMax: 12,
        restSeconds: 90,
        sets: [
          { id: 's1', setNumber: 1, tag: 'rir1', weightKg: 25, reps: 12, completed: true },
          { id: 's2', setNumber: 2, tag: 'rir1', weightKg: 25, reps: 12, completed: true },
        ],
      })
    ).toBe('- Seated Calf Raises: 25 kg/side x 12, 12');
  });

  it('groups multi-weight working sets separated by slash (Review Focus #5)', () => {
    expect(
      formatExerciseBlockLine({
        id: 'b3',
        exerciseId: 'reverse-curl',
        exerciseName: 'Barbell Reverse Curls',
        loadMode: 'standard',
        isUnilateral: false,
        targetRepMax: 8,
        restSeconds: 90,
        sets: [
          { id: 's1', setNumber: 1, tag: 'fail', weightKg: 12.5, reps: 8, completed: true },
          { id: 's2', setNumber: 2, tag: 'fail', weightKg: 10, reps: 8, completed: true },
          { id: 's3', setNumber: 3, tag: 'fail', weightKg: 10, reps: 8, completed: true },
        ],
      })
    ).toBe('- Barbell Reverse Curls: 12.5 kg x 8 / 10 kg x 8, 8 (fail)');
  });

  it('formats full session as plain-text note with header, exercise lines, and session notes', () => {
    const text = formatSessionAsText({
      id: 'sess-1',
      templateId: 'lower',
      title: 'Lower Session',
      startedAt: '2026-11-13T09:00:00.000Z',
      completedAt: '2026-11-13T10:05:00.000Z',
      status: 'completed',
      sessionNotes: 'Great quad pump today.',
      blocks: [
        {
          id: 'b1',
          exerciseId: 'leg-press',
          exerciseName: 'Free-Weight 45° Leg Press',
          loadMode: 'plate_per_side',
          baseSledKg: 67,
          isUnilateral: false,
          targetRepMax: 8,
          restSeconds: 180,
          sets: [
            { id: 's0', setNumber: 1, tag: 'warmup', weightKg: 40, reps: 6, completed: true },
            { id: 's1', setNumber: 2, tag: 'rir1', weightKg: 65, reps: 8, completed: true },
            { id: 's2', setNumber: 3, tag: 'fail', weightKg: 65, reps: 8, completed: true },
          ],
        },
      ],
    });

    expect(text).toContain('Lower Session — 2026-11-13');
    expect(text).toContain('- Free-Weight 45° Leg Press: 65 kg/side (197 kg total) x 8, 8 (fail)');
    expect(text).toContain('Great quad pump today.');
  });
});
