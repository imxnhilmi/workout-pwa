import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  addExerciseBlockToSession,
  addSetToBlock,
  completeWorkoutSession,
  db,
  ensureSeeded,
  getExerciseHistoryAndPB,
  removeSetFromBlock,
  setBlockUnilateralMode,
  startSessionFromTemplate,
  swapExerciseInSessionBlock,
  updateSetInBlock,
} from '../database';

describe('Dexie WorkoutDatabase, Seeding, and Type-to-Swap', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await ensureSeeded();
  });

  it('seeds brand-agnostic exercises and exact Upper (6), Lower (7), and Arms (6) default templates', async () => {
    const exercises = await db.exercises.toArray();
    expect(exercises.length).toBeGreaterThanOrEqual(24);
    for (const ex of exercises) {
      expect(ex.name).not.toMatch(/Matrix|Precor|Anytime Fitness|\bAF\b/i);
      if (ex.notes) {
        expect(ex.notes).not.toMatch(/Matrix|Precor|Anytime Fitness|\bAF\b/i);
      }
    }

    const upper = await db.templates.get('upper');
    const lower = await db.templates.get('lower');
    const arms = await db.templates.get('arms');
    expect(upper?.defaultExerciseIds).toHaveLength(6);
    expect(lower?.defaultExerciseIds).toHaveLength(7);
    expect(arms?.defaultExerciseIds).toHaveLength(6);
  });

  it('is idempotent when ensureSeeded is called multiple times', async () => {
    const initialCount = await db.exercises.count();
    const initialSessions = await db.sessions.count();
    await ensureSeeded();
    expect(await db.exercises.count()).toBe(initialCount);
    expect(await db.sessions.count()).toBe(initialSessions);
  });

  it('populates last logged weights and sets when starting an Upper session, and swaps to existing or brand-new typed exercise without creating duplicates (Review Focus #4)', async () => {
    const session = await startSessionFromTemplate('upper');
    expect(session.blocks[0].exerciseName).toBe('Incline DB Chest Press');
    expect(session.blocks[0].sets[0].weightKg).toBe(22.5);

    // Swap by typing existing exercise name case-insensitively
    const countBefore = await db.exercises.count();
    const swappedExisting = await swapExerciseInSessionBlock(
      session.id,
      session.blocks[0].id,
      '  cable chest press '
    );
    const countAfterExisting = await db.exercises.count();
    expect(countAfterExisting).toBe(countBefore);
    expect(swappedExisting.blocks[0].exerciseName).toBe('Cable Chest Press');
    expect(swappedExisting.blocks[0].sets[0].weightKg).toBe(50);

    // Swap by typing a brand-new exercise name on the fly with unilateral option enabled
    const swappedNew = await swapExerciseInSessionBlock(
      session.id,
      session.blocks[0].id,
      'Converging Plate Chest Press',
      true
    );
    expect(await db.exercises.count()).toBe(countBefore + 1);
    expect(swappedNew.blocks[0].exerciseName).toBe('Converging Plate Chest Press');
    expect(swappedNew.blocks[0].isUnilateral).toBe(true);
  });

  it('allows toggling an active exercise block between Bilateral and Unilateral while preserving set rep counts', async () => {
    const session = await startSessionFromTemplate('upper');
    const blockId = session.blocks[0].id; // Incline DB Chest Press (starts bilateral: 7, 7)
    expect(session.blocks[0].isUnilateral).toBe(false);

    const toggledUni = await setBlockUnilateralMode(session.id, blockId, true);
    expect(toggledUni.blocks[0].isUnilateral).toBe(true);
    expect(toggledUni.blocks[0].sets[0].repsLeft).toBe(7);
    expect(toggledUni.blocks[0].sets[0].repsRight).toBe(7);

    const toggledBi = await setBlockUnilateralMode(session.id, blockId, false);
    expect(toggledBi.blocks[0].isUnilateral).toBe(false);
    expect(toggledBi.blocks[0].sets[0].reps).toBe(7);
  });

  it('computes PB, progression history points, and Ready to Progress status from seeded history', async () => {
    const cableChest = await db.exercises.where('name').equals('Cable Chest Press').first();
    const stats = await getExerciseHistoryAndPB(cableChest!.id);
    expect(stats.pbWeightKg).toBe(50);
    expect(stats.readyToProgress).toBe(true);
    expect(stats.historyPoints.length).toBeGreaterThanOrEqual(1);

    const inclineDb = await db.exercises.where('name').equals('Incline DB Chest Press').first();
    const inclineStats = await getExerciseHistoryAndPB(inclineDb!.id);
    expect(inclineStats.pbWeightKg).toBe(22.5);
    expect(inclineStats.readyToProgress).toBe(false);
    expect(inclineStats.historyPoints.length).toBeGreaterThanOrEqual(2);
    expect(inclineStats.historyPoints[0].topWeightKg).toBe(17.5);
    expect(inclineStats.historyPoints[inclineStats.historyPoints.length - 1].topWeightKg).toBe(22.5);

    const legPress = await db.exercises.where('name').equals('Free-Weight 45° Leg Press').first();
    const legPressStats = await getExerciseHistoryAndPB(legPress!.id);
    expect(legPressStats.pbWeightKg).toBe(65);
    expect(legPressStats.readyToProgress).toBe(true);
    expect(legPressStats.historyPoints[0].topWeightKg).toBe(40);
    expect(legPressStats.historyPoints[legPressStats.historyPoints.length - 1].topWeightKg).toBe(65);

    const assistedPullUp = await db.exercises
      .where('name')
      .equals('Assisted Pull-Up Machine')
      .first();
    const assistedStats = await getExerciseHistoryAndPB(assistedPullUp!.id);
    expect(assistedStats.pbWeightKg).toBe(20.4);
    expect(assistedStats.historyPoints.length).toBeGreaterThanOrEqual(2);
    expect(assistedStats.historyPoints[0].estimated1RM).toBeLessThan(0);
    expect(
      assistedStats.historyPoints[assistedStats.historyPoints.length - 1].estimated1RM
    ).toBeGreaterThan(assistedStats.historyPoints[0].estimated1RM);
  });

  it('supports updating sets, adding/removing sets, adding exercise blocks, and completing a session', async () => {
    const session = await startSessionFromTemplate('lower');
    expect(session.blocks).toHaveLength(7);
    const firstBlockId = session.blocks[0].id;
    const firstSetId = session.blocks[0].sets[0].id;

    // Update set weight & completion
    const updated = await updateSetInBlock(session.id, firstBlockId, firstSetId, {
      weightKg: 70,
      reps: 8,
      completed: true,
    });
    expect(updated.blocks[0].sets[0].weightKg).toBe(70);
    expect(updated.blocks[0].sets[0].totalWeightKg).toBe(207); // 70 * 2 + 67 sled
    expect(updated.blocks[0].sets[0].completed).toBe(true);

    // Add set
    const withExtraSet = await addSetToBlock(session.id, firstBlockId);
    expect(withExtraSet.blocks[0].sets).toHaveLength(4);

    // Remove set
    const extraSetId = withExtraSet.blocks[0].sets[3].id;
    const afterRemove = await removeSetFromBlock(session.id, firstBlockId, extraSetId);
    expect(afterRemove.blocks[0].sets).toHaveLength(3);

    // Add a custom block to session
    const withNewBlock = await addExerciseBlockToSession(session.id, 'Hack Squat Machine', false);
    expect(withNewBlock.blocks).toHaveLength(8);
    expect(withNewBlock.blocks[7].exerciseName).toBe('Hack Squat Machine');

    // Complete session
    const completed = await completeWorkoutSession(session.id, 'Great lower session');
    expect(completed.status).toBe('completed');
    expect(completed.completedAt).toBeDefined();
    expect(completed.sessionNotes).toBe('Great lower session');
  });
});
