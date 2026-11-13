# Custom Gym Workout Tracker PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first, offline-capable dark-mode Progressive Web App (PWA) for logging gym workouts, tracking progressive overload, swapping exercises on the fly by typing/searching, and backing up data locally and to Google Drive with zero secrets exposed in the frontend or GitHub.

**Architecture:** A React 19 + TypeScript + Vite single-page PWA backed by on-device `IndexedDB` via Dexie.js (`src/db/`), pure domain calculation and export engines (`src/domain/`), and a server-side/Vite middleware `/api/drive/sync` endpoint that reads Google OAuth credentials strictly from server-side `.env` (never bundled into client JS). Pre-seeded on first launch with all 24 brand-agnostic exercises, progression history, and Upper/Lower/Arms templates.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, Dexie.js (`dexie`, `dexie-react-hooks`), `lucide-react`, `vite-plugin-pwa`, Vitest + `@testing-library/react` + `fake-indexeddb`.

**Spec:** `docs/superpowers/specs/2026-11-13-gym-workout-pwa-design.md`

## Global Constraints

- **Brand-Agnostic Copy:** Exercise names and UI copy must never mention gym chains ("Anytime Fitness", "AF") or machine brands ("Matrix", "Precor").
- **Security & Secrets Policy:** `.env` and secret files must remain git-ignored; no secret environment variable may use the `VITE_` prefix or appear in frontend code. Only `.env.example` with blank placeholders is committed.
- **Mobile Dark-First UX:** High-contrast zinc/emerald dark mode (`#09090b` background), minimum `44px` touch targets, instant persistence to `IndexedDB` on every tap.
- **Git Discipline:** Commit and push to `origin main` (`https://github.com/imxnhilmi/workout-pwa.git`) after each completed task.

## Review Focus

1. **Unilateral imbalance & partial reps on Ready-to-Progress:** An unilateral exercise where Left hits `8` reps but Right hits `7` reps (or vice versa) must **not** trigger the `Ready to Progress` badge (`isReadyToProgress` must require both `repsLeft >= targetRepMax` and `repsRight >= targetRepMax` on all working sets).
2. **Warmup and Dropset exclusion from Ready-to-Progress & 3-set primer tagging:** A session with a `warmup` set of `4 reps` or a `dropset` of `5 reps` alongside working sets of `8, 8, 8` must still earn `Ready to Progress`, whereas a session with working sets only of `warmup`/`dropset` (zero working sets) must return `false`.
3. **Assisted bodyweight progression direction (`assisted_bw`):** For `Assisted Pull-Up Machine` (`BW - 20.4 kg`), less assistance (`BW - 15 kg`) is heavier/stronger than more assistance (`BW - 25 kg`); PB calculation and progression charts must rank lower offset numbers as higher effective load.
4. **Type-to-Swap case-insensitive duplicate prevention & custom creation:** Typing `"cable chest press"` (lowercase or with trailing whitespace) in the Swap box must match existing `"Cable Chest Press"` rather than creating a duplicate exercise, while typing a genuinely new name creates a new `Exercise` record and swaps the active block while preserving set count.
5. **Multi-weight set grouping in plain-text note export:** When a user changes weight mid-exercise (e.g., `Barbell Reverse Curls: 12.5 kg x 8` then `10 kg x 8, 8`), `formatSessionAsText` must group contiguous same-weight sets separated by ` / ` (`12.5 kg x 8 / 10 kg x 8, 8`) rather than wrongly attributing Set 1's weight to all sets.

---

## Planned File Structure

- `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `.env.example` — Project config, PWA manifest plugin, Vitest setup, and server-side `/api/drive` plugin.
- `src/types/workout.ts` — Core TypeScript interfaces (`Exercise`, `WorkoutSetLog`, `WorkoutExerciseBlock`, `WorkoutSession`, `WorkoutTemplate`, `LoadMode`, `SetTag`).
- `src/domain/calculations.ts` — Pure functions for plate-loaded sled math, default set tag assignment (`2-set` vs `3-set`), Epley 1RM, `isReadyToProgress`, and PB comparison (including `assisted_bw`).
- `src/domain/textExport.ts` — Plain-text note formatter (`formatSessionAsText`) handling bilateral, unilateral `6L/6R`, plate-per-side `[197 kg total]`, `BW - X kg`, and multi-weight slashes.
- `src/db/seedData.ts` — Brand-agnostic catalog of all 24 exercises, 3 default templates (`upper`, `lower`, `arms`), and pre-seeded historical sessions reflecting Sept–Nov 2026 PBs.
- `src/db/database.ts` — Dexie `WorkoutDatabase` class, `ensureSeeded()`, session initialization from templates (auto-filling last weights/reps), and `swapExerciseInBlock()` (existing or on-the-fly custom exercise).
- `src/services/backupService.ts` — JSON export/import validation, mobile Web Share API (`navigator.share`) file backup to Google Drive, and `/api/drive/sync` client wrapper.
- `server/driveApiPlugin.ts` — Vite server middleware & serverless handler reading `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` from `process.env` (never exposed to client bundle).
- `src/components/ActiveWorkoutView.tsx`, `src/components/ExerciseBlockCard.tsx`, `src/components/SwapExerciseModal.tsx`, `src/components/RestTimerBar.tsx` — Active workout logging UI, micro-increment steppers, L/R toggle, and Type-to-Swap combobox.
- `src/components/AnalyticsView.tsx`, `src/components/HistoryExportView.tsx`, `src/components/DriveBackupPanel.tsx` — Exercise progression charts, PB & `Ready to Progress` board, 1-tap text note export, and Google Drive backup/sync controls.

---

### Task 1: Project Scaffolding & Domain Calculations Engine

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `.env.example`
- Create: `src/types/workout.ts`
- Create: `src/domain/calculations.ts`
- Test: `src/domain/__tests__/calculations.test.ts`

**Interfaces:**
- Produces in `src/types/workout.ts`:
  - `type Category = 'upper' | 'lower' | 'arms'`
  - `type LoadMode = 'standard' | 'plate_per_side' | 'per_side_only' | 'assisted_bw'`
  - `type SetTag = 'warmup' | 'rir2' | 'rir1' | 'fail' | 'dropset'`
  - `interface Exercise`, `interface WorkoutSetLog`, `interface WorkoutExerciseBlock`, `interface WorkoutSession`, `interface WorkoutTemplate` (exact fields per Spec §5.2)
- Produces in `src/domain/calculations.ts`:
  - `computeTotalWeightKg(weightKg: number, loadMode: LoadMode, baseSledKg?: number): number`
  - `createDefaultSetTags(workingSetCount: number): SetTag[]`
  - `isReadyToProgress(block: Pick<WorkoutExerciseBlock, 'isUnilateral' | 'targetRepMax' | 'sets'>): boolean`
  - `computeEffectiveLoadScore(weightKg: number, loadMode: LoadMode, baseSledKg?: number): number`
  - `estimateOneRepMax(weightKg: number, reps: number, loadMode: LoadMode, baseSledKg?: number): number`

- [x] **Step 1: Scaffold Vite + React + TypeScript + Tailwind + Vitest project and create `.env.example` & `src/types/workout.ts`**

Create `.env.example` with blank server-only placeholders (`GOOGLE_CLIENT_ID=`, `GOOGLE_CLIENT_SECRET=`, `GOOGLE_REFRESH_TOKEN=`, `GOOGLE_DRIVE_FOLDER_ID=`) and define the exact interfaces from Spec §5.2 in `src/types/workout.ts`.

- [x] **Step 2: Write the failing unit tests in `src/domain/__tests__/calculations.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import {
  computeEffectiveLoadScore,
  computeTotalWeightKg,
  createDefaultSetTags,
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
  });
});
```

- [x] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/domain/__tests__/calculations.test.ts`
Expected: FAIL with module `../calculations` not found.

- [x] **Step 4: Implement `src/domain/calculations.ts`**

Implement `computeTotalWeightKg`, `createDefaultSetTags`, `isReadyToProgress` (filtering working sets to `tag !== 'warmup' && tag !== 'dropset' && completed`), `computeEffectiveLoadScore` (returning `-weightKg` for `assisted_bw` so `15 > 20.4`), and `estimateOneRepMax`.

- [x] **Step 5: Run test to verify it passes and commit**

Run: `npx vitest run src/domain/__tests__/calculations.test.ts`
Expected: PASS (4 passed)

```bash
git add .
git commit -m "feat: scaffold PWA project and add domain calculation engine"
git push
```

---

### Task 2: Plain-Text Note Log Formatter (`textExport.ts`)

**Files:**
- Create: `src/domain/textExport.ts`
- Test: `src/domain/__tests__/textExport.test.ts`

**Interfaces:**
- Consumes: `WorkoutSession`, `WorkoutExerciseBlock`, `WorkoutSetLog` from `src/types/workout.ts`, `computeTotalWeightKg` from `src/domain/calculations.ts`
- Produces in `src/domain/textExport.ts`:
  - `formatExerciseBlockLine(block: WorkoutExerciseBlock): string`
  - `formatSessionAsText(session: WorkoutSession): string`

- [x] **Step 1: Write the failing tests in `src/domain/__tests__/textExport.test.ts`**

```ts
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
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/__tests__/textExport.test.ts`
Expected: FAIL with module `../textExport` not found.

- [x] **Step 3: Implement `src/domain/textExport.ts`**

Group consecutive completed working sets by `weightKg`, format each group according to `loadMode` (`X kg`, `X kg/side (Y kg total)`, `X kg/side`, or `BW - X kg`), format unilateral sets as `${repsLeft}L/${repsRight}R`, and append `(fail)` if any working set is tagged `'fail'`.

- [x] **Step 4: Run test to verify it passes and commit**

Run: `npx vitest run src/domain/__tests__/textExport.test.ts`
Expected: PASS

```bash
git add src/domain/textExport.ts src/domain/__tests__/textExport.test.ts
git commit -m "feat: add plain-text workout note log formatter"
git push
```

---

### Task 3: Brand-Agnostic Seed Data, Dexie Database & Type-to-Swap Engine

**Files:**
- Create: `src/db/seedData.ts`
- Create: `src/db/database.ts`
- Test: `src/db/__tests__/database.test.ts`

**Interfaces:**
- Consumes: `src/types/workout.ts`, `src/domain/calculations.ts`
- Produces in `src/db/seedData.ts`:
  - `INITIAL_EXERCISES: Exercise[]` (all 24 brand-agnostic exercises from Spec §5.4)
  - `DEFAULT_TEMPLATES: WorkoutTemplate[]` (`upper` with 6 exercises, `lower` with 7 exercises, `arms` with 6 exercises per Spec §5.3)
  - `INITIAL_SESSIONS: WorkoutSession[]` (baseline & PB historical sessions so progression charts and last-logged numbers work immediately)
- Produces in `src/db/database.ts`:
  - `db: WorkoutDatabase`
  - `ensureSeeded(): Promise<void>`
  - `startSessionFromTemplate(templateId: 'upper' | 'lower' | 'arms' | 'custom'): Promise<WorkoutSession>`
  - `swapExerciseInSessionBlock(sessionId: string, blockId: string, targetQueryOrExerciseId: string, overrideUnilateral?: boolean): Promise<WorkoutSession>`
  - `setBlockUnilateralMode(sessionId: string, blockId: string, isUnilateral: boolean): Promise<WorkoutSession>`
  - `getExerciseHistoryAndPB(exerciseId: string): Promise<{ lastBlock?: WorkoutExerciseBlock; pbWeightKg?: number; pbSummary?: string; readyToProgress: boolean }>`

- [x] **Step 1: Write failing tests in `src/db/__tests__/database.test.ts`**

```ts
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  db,
  ensureSeeded,
  getExerciseHistoryAndPB,
  setBlockUnilateralMode,
  startSessionFromTemplate,
  swapExerciseInSessionBlock,
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
    }

    const upper = await db.templates.get('upper');
    const lower = await db.templates.get('lower');
    const arms = await db.templates.get('arms');
    expect(upper?.defaultExerciseIds).toHaveLength(6);
    expect(lower?.defaultExerciseIds).toHaveLength(7);
    expect(arms?.defaultExerciseIds).toHaveLength(6);
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

  it('computes PB and Ready to Progress status from seeded history', async () => {
    const cableChest = await db.exercises.where('name').equals('Cable Chest Press').first();
    const stats = await getExerciseHistoryAndPB(cableChest!.id);
    expect(stats.pbWeightKg).toBe(50);
    expect(stats.readyToProgress).toBe(true);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/db/__tests__/database.test.ts`
Expected: FAIL with module `../database` not found.

- [x] **Step 3: Implement `src/db/seedData.ts` and `src/db/database.ts`**

Implement `INITIAL_EXERCISES`, `DEFAULT_TEMPLATES`, and `INITIAL_SESSIONS` (including both baseline sessions e.g. `17.5 kg` Incline DB Press / `40 kg/side` Leg Press and latest PB sessions e.g. `22.5 kg x 7, 7` Incline DB Press / `65 kg/side x 8, 8, 8` Leg Press so charts show multi-point progression immediately). In `swapExerciseInSessionBlock`, trim and case-insensitively match existing exercises by `id` or `name` before creating a new `Exercise` record if no match exists.

- [x] **Step 4: Run test to verify it passes and commit**

Run: `npx vitest run src/db/__tests__/database.test.ts`
Expected: PASS

```bash
git add src/db/
git commit -m "feat: add Dexie IndexedDB layer, brand-agnostic seed data, and type-to-swap logic"
git push
```

---

### Task 4: Backup Service & `.env`-Protected Google Drive Sync Endpoint

**Files:**
- Create: `src/services/backupService.ts`
- Create: `server/driveApiPlugin.ts`
- Modify: `vite.config.ts`
- Test: `src/services/__tests__/backupService.test.ts`

**Interfaces:**
- Consumes: `db` from `src/db/database.ts`
- Produces in `src/services/backupService.ts`:
  - `interface BackupPayload { version: 1; exportedAt: string; exercises: Exercise[]; templates: WorkoutTemplate[]; sessions: WorkoutSession[] }`
  - `exportDatabasePayload(): Promise<BackupPayload>`
  - `importDatabasePayload(jsonString: string): Promise<{ exercisesCount: number; sessionsCount: number }>`
  - `shareOrDownloadBackupFile(): Promise<'shared' | 'downloaded'>`
  - `syncWithGoogleDriveServer(direction: 'push' | 'pull'): Promise<{ ok: boolean; message: string; syncedAt?: string }>`
- Produces in `server/driveApiPlugin.ts`:
  - `driveApiVitePlugin(): Plugin` handling `GET /api/drive/status`, `POST /api/drive/push`, `POST /api/drive/pull` using `process.env.GOOGLE_CLIENT_ID`, `process.env.GOOGLE_CLIENT_SECRET`, and `process.env.GOOGLE_REFRESH_TOKEN` on the server side only.

- [x] **Step 1: Write failing tests in `src/services/__tests__/backupService.test.ts`**

```ts
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, ensureSeeded } from '../../db/database';
import { exportDatabasePayload, importDatabasePayload } from '../backupService';

describe('Backup & Restore Service', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await ensureSeeded();
  });

  it('exports full IndexedDB state to JSON and restores it cleanly into an empty database', async () => {
    const payload = await exportDatabasePayload();
    expect(payload.version).toBe(1);
    expect(payload.exercises.length).toBeGreaterThanOrEqual(24);

    await db.exercises.clear();
    await db.sessions.clear();
    expect(await db.exercises.count()).toBe(0);

    const result = await importDatabasePayload(JSON.stringify(payload));
    expect(result.exercisesCount).toBe(payload.exercises.length);
    expect(await db.exercises.count()).toBe(payload.exercises.length);
  });

  it('rejects malformed backup JSON without corrupting existing database records', async () => {
    const countBefore = await db.exercises.count();
    await expect(importDatabasePayload('{"invalid":true}')).rejects.toThrow(/Invalid backup format/);
    expect(await db.exercises.count()).toBe(countBefore);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/__tests__/backupService.test.ts`
Expected: FAIL with module `../backupService` not found.

- [x] **Step 3: Implement `src/services/backupService.ts` and `server/driveApiPlugin.ts`**

Implement transactional export/import in `src/services/backupService.ts`, native `navigator.share({ files: [file] })` fallback to anchor download for zero-config Google Drive saving, and `server/driveApiPlugin.ts` reading OAuth credentials exclusively from `process.env` on the server.

- [x] **Step 4: Run test to verify it passes and commit**

Run: `npx vitest run src/services/__tests__/backupService.test.ts`
Expected: PASS

```bash
git add src/services/ server/ vite.config.ts
git commit -m "feat: add JSON/WebShare Google Drive backup and server-side .env Drive sync route"
git push
```

---

### Task 5: Mobile-First Active Workout UI, Type-to-Swap Combobox, Analytics & PWA Shell

**Files:**
- Create: `src/components/ExerciseBlockCard.tsx`
- Create: `src/components/SwapExerciseModal.tsx`
- Create: `src/components/RestTimerBar.tsx`
- Create: `src/components/ActiveWorkoutView.tsx`
- Create: `src/components/AnalyticsView.tsx`
- Create: `src/components/HistoryExportView.tsx`
- Create: `src/components/DriveBackupPanel.tsx`
- Modify: `src/App.tsx`, `src/main.tsx`
- Test: `src/components/__tests__/App.integration.test.tsx`

**Interfaces:**
- Consumes: `src/db/database.ts`, `src/domain/calculations.ts`, `src/domain/textExport.ts`, `src/services/backupService.ts`
- Produces: Complete mobile-first dark UI with 4 bottom navigation tabs:
  1. **Workout (`ActiveWorkoutView`):** Template launcher (`Upper`, `Lower`, `Arms`, `Blank`), exercise cards with inline PB & `Ready to Progress` badges, micro-increment weight steppers (`0.5`, `1.25`, `2.25`, `2.5 kg`), `67 kg` leg press sled live total, `L/R` unilateral rep steppers, set tag pills (`W`, `RIR 2`, `RIR 1`, `Fail`, `Drop`), **Swap** combobox (type any exercise or tap suggestion chip), and auto-starting floating rest timer.
  2. **Progress (`AnalyticsView`):** Searchable exercise selector, SVG progression chart (`Top Weight`, `Estimated 1RM`, `Total Working Volume`), `Ready to Progress` filter badge, and full brand-agnostic PB directory.
  3. **History & Notes (`HistoryExportView`):** Completed sessions list with 1-tap **"Copy as Text Log"** formatted in the user's plain-text note style.
  4. **Drive & Backup (`DriveBackupPanel`):** 1-tap **Save/Share to Google Drive**, JSON Export/Import, and `.env`-backed Google Drive Cloud Sync status & Push/Pull triggers.

- [x] **Step 1: Write the failing UI integration test in `src/components/__tests__/App.integration.test.tsx`**

```tsx
import 'fake-indexeddb/auto';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../../App';

describe('Gym Workout Tracker PWA UI Integration', () => {
  it('renders templates, starts an Upper workout, and swaps an exercise by typing a custom name', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Start Upper Session/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Start Upper Session/i));

    await waitFor(() => {
      expect(screen.getByText('Incline DB Chest Press')).toBeInTheDocument();
    });

    const swapButtons = screen.getAllByRole('button', { name: /Swap/i });
    fireEvent.click(swapButtons[0]);

    const input = screen.getByPlaceholderText(/Type or search exercise to swap/i);
    fireEvent.change(input, { target: { value: 'Converging Chest Press' } });

    const useCustomBtn = await screen.findByRole('button', {
      name: /Use "Converging Chest Press"/i,
    });
    fireEvent.click(useCustomBtn);

    await waitFor(() => {
      expect(screen.getByText('Converging Chest Press')).toBeInTheDocument();
    });

    // User can toggle between Bilateral and Unilateral L/R mode while logging the workout
    const unilateralToggles = screen.getAllByRole('button', { name: /Unilateral L\/R/i });
    fireEvent.click(unilateralToggles[0]);

    await waitFor(() => {
      expect(screen.getAllByText(/L Reps/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/R Reps/i).length).toBeGreaterThan(0);
    });
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/App.integration.test.tsx`
Expected: FAIL

- [x] **Step 3: Implement the UI components and `src/App.tsx`**

Build all components in `src/components/` and wire `src/App.tsx` with `navigator.storage.persist()` on mount.

- [x] **Step 4: Run full test suite and production PWA build to verify everything passes**

Run: `npx vitest run && npm run build`
Expected: All tests PASS and Vite PWA build outputs `dist/sw.js` and `dist/manifest.webmanifest` with zero TypeScript errors.

- [x] **Step 5: Commit and push to GitHub**

```bash
git add .
git commit -m "feat: implement mobile-first workout UI, type-to-swap combobox, analytics, and Google Drive backup"
git push
```

