import { describe, expect, it } from 'vitest';
import {
  computeEffectiveLoadScore,
  computeTotalWeightKg,
  createDefaultSetTags,
  estimateOneRepMax,
  isReadyToProgress,
} from '../calculations';

describe('calculations domain engine', () => {
  it('calculates 45-degree leg press total load with 67 kg base sled', () => {
    expect(computeTotalWeightKg(65, 'plate_per_side', 67)).toBe(197);
    expect(computeTotalWeightKg(40, 'plate_per_side', 67)).toBe(147);
    expect(computeTotalWeightKg(25, 'per_side_only')).toBe(50);
    expect(computeTotalWeightKg(50, 'standard')).toBe(50);
  });

  it('assigns RIR1 primer + Fail for 3 sets, and all Fail for 2 sets', () => {
    expect(createDefaultSetTags(3)).toEqual(['rir1', 'fail', 'fail']);
    expect(createDefaultSetTags(2)).toEqual(['fail', 'fail']);
  });

  it('flags Ready to Progress only when all working sets hit targetRepMax cleanly (including unilateral L/R and ignoring warmup/dropset)', () => {
    expect(
      isReadyToProgress({
        isUnilateral: false,
        targetRepMax: 8,
        sets: [
          { id: '1', setNumber: 1, tag: 'warmup', weightKg: 30, reps: 4, completed: true },
          { id: '2', setNumber: 2, tag: 'rir1', weightKg: 50, reps: 8, completed: true },
          { id: '3', setNumber: 3, tag: 'fail', weightKg: 50, reps: 8, completed: true },
          { id: '4', setNumber: 4, tag: 'fail', weightKg: 50, reps: 8, completed: true },
          { id: '5', setNumber: 5, tag: 'dropset', weightKg: 35, reps: 5, completed: true },
        ],
      })
    ).toBe(true);

    // Review Focus #1: Unilateral imbalance (8L / 7R) must NOT be ready to progress
    expect(
      isReadyToProgress({
        isUnilateral: true,
        targetRepMax: 8,
        sets: [
          { id: '1', setNumber: 1, tag: 'rir1', weightKg: 10, repsLeft: 8, repsRight: 8, completed: true },
          { id: '2', setNumber: 2, tag: 'fail', weightKg: 10, repsLeft: 8, repsRight: 7, completed: true },
        ],
      })
    ).toBe(false);

    // Review Focus #2: Zero working sets (only warmup) returns false
    expect(
      isReadyToProgress({
        isUnilateral: false,
        targetRepMax: 8,
        sets: [{ id: '1', setNumber: 1, tag: 'warmup', weightKg: 20, reps: 10, completed: true }],
      })
    ).toBe(false);
  });

  it('ranks lower assistance offset as stronger for assisted_bw (Review Focus #3)', () => {
    expect(computeEffectiveLoadScore(15, 'assisted_bw')).toBeGreaterThan(
      computeEffectiveLoadScore(20.4, 'assisted_bw')
    );
    expect(estimateOneRepMax(60, 8, 'standard')).toBeCloseTo(76, 1);
  });
});
