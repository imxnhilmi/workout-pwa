# Custom Gym Workout Tracker PWA — Design Specification

**Date:** 2026-11-13  
**Status:** Approved & Implemented (All 5 Tasks & Final Review Complete)

---

## 1. Intent & Why

The user wants a fast, mobile-first Progressive Web App (PWA) built for logging gym workouts between sets with one hand, tracking progressive overload accurately, and handling real-world gym floor friction without clutter or vendor/brand lock-in.

Specifically, generic workout trackers fail in a few practical ways:
1. **Occupied Equipment & On-the-Fly Swaps:** When a machine or cable station is taken, the lifter needs to swap the exercise in seconds—either by typing/searching any existing exercise or typing a brand-new exercise name on the fly—and immediately see that swapped exercise's own historical weights, reps, and Personal Best (PB).
2. **Real Set & Failure Semantics:**
   - **3-working-set movements:** Set 1 is typically a sub-failure primer (`1–2 RIR`), followed by Sets 2–3 taken to failure (`Fail`), even when the exercise block is summarized as `fail` in plain-text notes.
   - **2-working-set movements:** Both working sets (`Set 1` and `Set 2`) are taken to true mechanical failure (`Fail`).
   - Individual sets need 1-tap status tags: `Warmup`, `RIR 2`, `RIR 1`, `Fail`, and `Dropset`.
3. **Unilateral Imbalance Tracking:** Single-arm and single-leg exercises need separate Left (`L`) and Right (`R`) rep tracking (often starting with the weaker left side) so strength deficits are visible and eliminated over time.
4. **Plate-Loaded Sled Math:** Plate-loaded movements like the **Free-Weight 45° Leg Press** are loaded by plate weight per side (e.g., `65 kg/side`) on top of a `67 kg` base sled (`197 kg total`). The UI must accept `kg/side` while automatically computing and displaying total load: $\text{Total Load} = (\text{Weight Per Side} \times 2) + \text{Base Sled Weight}$.
5. **Micro-Increments & Assisted Bodyweight:** Cable stacks with add-on plates and dumbbells require quick steppers supporting `0.5 kg`, `1.25 kg`, `2.25 kg`, and `2.5 kg` steps, plus negative/assisted offset notation (`BW - 20.4 kg`) for the Assisted Pull-Up Machine.
6. **Zero-Signal Reliability + Free Cloud Backup:** Gym floors often have cellular dead zones. The app must work 100% offline first via on-device `IndexedDB`, while supporting free backup/sync to the user's **Google Drive** as well as 1-tap plain-text note export and JSON file import/export.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- **Sub-5-Second Set Logging:** Log or adjust weight, reps (bilateral or L/R), and set status (`Warmup`, `RIR 2`, `RIR 1`, `Fail`, `Dropset`) with one thumb during rest intervals.
- **Type-Any-Exercise Swap UI:** Allow swapping any exercise slot during an active workout by typing/searching in an inline combobox—matching existing library exercises or creating a new exercise on the spot—with quick suggestion chips for common alternatives.
- **Brand-Agnostic Exercise Library:** Keep all exercise names general (no gym chain names or machine manufacturer brands like Matrix/Precor).
- **Pre-Seeded Baseline History & PBs:** Initialize the database out of the box with all 24 baseline exercises, historical progression notes, and current Personal Bests so the first workout already has complete reference numbers and "Ready to Progress" badges.
- **Actionable Progressive Overload Signals:** Automatically compute and display a **"Ready to Progress"** badge when an exercise has achieved clean target reps (`>= 8 reps`, or `>= 12 reps` for calves) across all working sets in its most recent session.
- **Plain-Text Note Export:** Format any completed session into the user's concise note format (`Exercise: weight x reps, reps (fail)`) with 1-tap clipboard copy.
- **Offline-First Storage + Google Drive Backup:** Store all data locally in `IndexedDB` (via Dexie.js) with `navigator.storage.persist()`, paired with Google Drive backup/sync (both zero-config native mobile share/file export to Google Drive and optional client-side Google Drive API OAuth auto-sync).

### Non-Goals
- Multi-user social feeds, leaderboards, or coaching marketplaces.
- Paid backend servers or databases that auto-pause after 7 days of inactivity.
- Video exercise demonstrations or heavy media assets that bloat offline cache size.

### Anti-Goals (What Would Make This a Failure Even If It Works)
- **Blocking the workout behind a login screen or network spinner:** The user must never be prevented from starting or logging a workout because an OAuth token expired or the gym has no signal.
- **Rigid swap menus:** Forcing the user to pre-configure a swap before starting a workout instead of letting them type whatever machine/exercise they switched to on the gym floor.
- **Losing active workout state if the browser tab refreshes or phone locks:** Every single tap during an active workout must persist immediately to `IndexedDB`.

---

## 3. Constraints

- **Platform:** Mobile-first Progressive Web App (installable on iOS Safari and Android Chrome via Web App Manifest + Service Worker).
- **Visual Theme:** High-contrast dark mode (`#09090b` / `#18181b` zinc surfaces, emerald/amber status accents, minimum `44px` touch targets) built for one-handed thumb reach.
- **Cost:** 100% free hosting and storage (static hosting + local `IndexedDB` + user's own Google Drive / JSON / clipboard).
- **Security & Secrets Policy:** Any API keys, passwords, or OAuth secrets must be stored strictly in `.env` (which is git-ignored via `.gitignore`) and kept out of both the GitHub repository and the compiled frontend client bundle (never hardcoded, never committed, and never exposed via `VITE_` client-bundled secret variables).
- **Version Control:** Git repository connected to `https://github.com/imxnhilmi/workout-pwa.git` with incremental commits on each completed task.

---

## 4. Approaches Considered

### Approach 1: Local-First `IndexedDB` (Dexie.js) + Google Drive Sync/Backup + JSON/Text Export *(Selected)*
- **How it works:** All reads and writes happen directly against local `IndexedDB` via Dexie.js (`<5ms` latency, 100% offline capable). For backup and cross-device portability, the app provides:
  1. **Zero-Config "Save to Google Drive" / File Export:** Uses the Web Share API (`navigator.share` with file payload on mobile) and standard JSON download/upload so the user can drop `workout-backup.json` into Google Drive in two taps without configuring API keys.
  2. **Direct Google Drive API Sync (Client-Side OAuth 2.0):** Uses Google Identity Services in the browser to upload/download `workout-tracker-db.json` directly to/from the user's Google Drive (`drive.file` scope) when a free Google OAuth Client ID is configured in Settings.
  3. **1-Tap Copy as Text Log:** Exports finished sessions in plain-text note format.
- **Trade-offs:** Instant offline speed, $0 cost forever, never pauses like free-tier SQL clouds, and gives both zero-setup and automated Google Drive backup paths.

### Approach 2: Local `IndexedDB` + Firebase Firestore Sync
- **Trade-offs:** Good offline caching and doesn't pause after 7 days, but requires creating and managing a Firebase project, Firestore security rules, and Firebase Auth configuration.

### Approach 3: Local `IndexedDB` + Supabase Free Tier
- **Trade-offs:** Relational Postgres backend, but Supabase pauses free projects after 7 days of inactivity, which breaks background sync after a deload or rest week.

**Decision:** The user selected **Approach 1 (Local `IndexedDB` + Google Drive storage/backup + Type-to-Swap UI)**.

---

## 5. Detailed Functional & Data Design

### 5.1 Tech Stack *(Builder Calls)*
- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS v4 (dark-first utility system, mobile viewport lock, safe-area inset padding)
- **Icons:** `lucide-react`
- **Local Database:** `dexie` + `dexie-react-hooks` (`IndexedDB` wrapper with reactive live queries)
- **Charts:** Lightweight responsive SVG line/area chart component (zero bloat, instant rendering for Top Weight, Estimated 1RM, and Session Volume)
- **PWA Offline Support:** `vite-plugin-pwa` (Workbox pre-caching all JS/CSS/HTML/icons for 100% offline startup)
- **Testing:** Vitest + React Testing Library for unit and integration testing of domain logic (plate math, overload calculation, text export formatting, database seeding, and swap flows)

### 5.2 Data Model (`IndexedDB` via Dexie)

```ts
export type Category = 'upper' | 'lower' | 'arms';

export type LoadMode =
  | 'standard'        // Standard weight in kg (e.g. 50 kg)
  | 'plate_per_side'  // Weight logged per side; total = (perSide * 2) + baseSledKg
  | 'per_side_only'   // Weight logged per side without a sled (e.g. Calf Raises 25 kg/side)
  | 'assisted_bw';    // Assisted bodyweight offset (e.g. BW - 20.4 kg; lower offset = stronger)

export type SetTag = 'warmup' | 'rir2' | 'rir1' | 'fail' | 'dropset';

export interface Exercise {
  id: string;
  name: string;                  // Brand-agnostic name (e.g. "Cable Chest Press")
  category: Category;
  loadMode: LoadMode;
  baseSledKg?: number;           // e.g. 67 for Free-Weight 45° Leg Press
  isUnilateral: boolean;         // True if tracking Left & Right reps separately
  defaultWorkingSets: number;    // 2 or 3 based on user's baseline template
  targetRepMax: number;          // Default 8 (12 for Calf Raises)
  defaultIncrementKg: number;    // e.g. 2.5, 2.25, 1.25, or 0.5
  suggestedSwapIds: string[];    // Quick-chip suggestions in the Swap UI
  notes?: string;                // Baseline progression note or cue (e.g. "Left-side start")
  createdAt: string;
}

export interface WorkoutSetLog {
  id: string;
  setNumber: number;
  tag: SetTag;
  weightKg: number;              // Entered weight (per-side if plate_per_side/per_side_only, offset if assisted_bw)
  totalWeightKg?: number;        // Computed total weight if plate_per_side ((weightKg * 2) + baseSledKg)
  reps?: number;                 // Used when isUnilateral === false
  repsLeft?: number;             // Used when isUnilateral === true
  repsRight?: number;            // Used when isUnilateral === true
  completed: boolean;
}

export interface WorkoutExerciseBlock {
  id: string;
  exerciseId: string;
  exerciseName: string;          // Snapshot of name at log time
  swappedFromExerciseId?: string;// Tracks if this slot was swapped from a template default
  loadMode: LoadMode;
  baseSledKg?: number;
  isUnilateral: boolean;
  targetRepMax: number;
  restSeconds: number;           // Default 120s (configurable 90s / 120s / 180s)
  sets: WorkoutSetLog[];
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  templateId: 'upper' | 'lower' | 'arms' | 'custom';
  title: string;                 // e.g. "Upper Session", "Lower Session", "Arms Session"
  startedAt: string;
  completedAt?: string;          // Undefined while session is active/in-progress
  status: 'active' | 'completed';
  blocks: WorkoutExerciseBlock[];
  sessionNotes?: string;
}

export interface WorkoutTemplate {
  id: 'upper' | 'lower' | 'arms';
  name: string;
  defaultExerciseIds: string[];
}
```

### 5.3 Default Templates (User-Specified)

#### 1. Upper Default Template (`upper`)
1. **Incline DB Chest Press** (`2 working sets`, standard load, quick swap chip: *Cable Chest Press*)
2. **T-Bar Row** (`2 working sets`, standard load, quick swap chips: *Neutral Grip Row (Plate-Loaded Machine)*, *Wide Grip Row*)
3. **Pec Fly Machine** (`3 working sets`, standard load)
4. **Lat Pulldown** (`2 working sets`, standard load, quick swap chip: *Assisted Pull-Up Machine*)
5. **Tricep Pushdown (Dual Cable)** (`3 working sets`, standard load, quick swap chip: *Tricep Pushdown (Single Cable)*)
6. **Unilateral Cable Lateral Raises** (`3 working sets`, unilateral L/R)

#### 2. Lower Default Template (`lower`)
1. **Free-Weight 45° Leg Press** (`3 working sets`, `plate_per_side` with `67 kg` base sled, quick swap chip: *Unilateral Machine Leg Press*)
2. **Seated Hamstring Curls** (`3 working sets`, standard load, supports swapping/typing alternate stack if needed)
3. **Leg Extension** (`3 working sets`, standard load)
4. **Hip Abduction (Abductors)** (`3 working sets`, standard load)
5. **Hip Adductor (Adductors)** (`3 working sets`, standard load)
6. **Calf Raises** (`3 working sets`, `per_side_only`, target `12 reps`, cue: `"2-sec pause at bottom stretch"`)
7. **Hip Extensions (Lower Back Extension)** (`2 working sets`, standard load)

#### 3. Arms Default Template (`arms`)
1. **Tricep Pushdown (Single Cable)** (`3 working sets`, standard load, quick swap chip: *Tricep Pushdown (Dual Cable)*)
2. **Cable Hammer Curls** (`3 working sets`, standard load)
3. **Tricep Overhead Extensions** (`2 working sets`, standard load)
4. **Unilateral Cable Lateral Raises** (`3 working sets`, unilateral L/R)
5. **Seated DB Alternating Curls** (`3 working sets`, unilateral L/R, cue: `"Left-side start"`)
6. **Barbell Reverse Curls** (`3 working sets`, standard load, finisher/dropset friendly)

*(Additional pre-seeded exercises in the Library ready for 1-tap or typed swap at any time: **Cable Chest Press**, **Neutral Grip Row (Plate-Loaded Machine)**, **Wide Grip Row**, **Assisted Pull-Up Machine**, **Cable Shoulder Press**, **Unilateral Machine Leg Press**, plus optional heavy-stack variants for **Seated Hamstring Curls (Heavy Stack)** and **Leg Extension (Heavy Stack)** so both historical PBs `45 kg` / `54 kg` and `68 kg` are preserved without brand names.)*

### 5.4 Pre-Seeded Historical Data & Personal Bests (Sept–Nov 2026)

On first launch, if the database is empty, the app seeds historical sessions covering the user's progression and latest PBs:

| Exercise (Brand-Agnostic) | Seeded PB Sets | Progression History / Notes |
| :--- | :--- | :--- |
| **Incline DB Chest Press** | `22.5 kg x 7, 7` | Progressed from `17.5 kg` |
| **Cable Chest Press** | `50 kg x 8, 8, 8` | Ready to increase weight (`Ready to Progress`) |
| **Pec Fly Machine** | `63 kg x 8, 8, 6` | Progressed from `41 kg` |
| **T-Bar Row** | `55 kg x 7, 6` | Progressed from `35 kg` |
| **Neutral Grip Row (Plate-Loaded Machine)** | `20 kg x 8, 8` | T-Bar Row alternative (`Ready to Progress`) |
| **Wide Grip Row** | `47.3 kg x 7, 7` | Row alternative |
| **Lat Pulldown** | `59 kg x 8, 7` | Strict/Controlled; progressed from `45 kg` |
| **Assisted Pull-Up Machine** | `BW - 20.4 kg x 6, 6` | Vertical pull secondary |
| **Cable Shoulder Press** | `36 kg x 8, 7, 6` | Progressed from `18 kg` |
| **Unilateral Cable Lateral Raises** | `6.8 kg x 6, 6, 6` (L/R) | L & R balanced; progressed from `4.5 kg` |
| **Tricep Pushdown (Dual Cable)** | `27 kg x 8, 8, 6` | Straight bar; progressed from `18 kg` |
| **Tricep Pushdown (Single Cable)** | `25.3 kg x 8, 8, 8` | Straight bar (`Ready to Progress`) |
| **Tricep Overhead Extensions** | `15.8 kg x 7, 7` | Cable; progressed from `10 kg` |
| **Cable Hammer Curls** | `22.5 kg x 8, 8, 7` | Progressed from `11 kg` |
| **Seated DB Alternating Curls** | `10 kg x 8, 8, 8` (L/R) | Left-side start; resolved L/R deficit (`Ready to Progress`) |
| **Barbell Reverse Curls** | `12.5 kg x 8`, `10 kg x 8, 8` | Forearm/brachialis finisher |
| **Free-Weight 45° Leg Press** | `65 kg/side x 8, 8, 8` (`197 kg` total) | `67 kg` base sled; progressed from `40 kg/side` (`Ready to Progress`) |
| **Unilateral Machine Leg Press** | `54 kg x 8` (L/R), `45 kg x 8` (L/R) | Left-side start |
| **Seated Hamstring Curls** | `45 kg x 8, 8, 7` | Secondary heavy stack PB: `68 kg x 8` |
| **Leg Extension** | `54 kg x 8, 8, 8` | Secondary heavy stack PB: `68 kg x 8` (`Ready to Progress`) |
| **Hip Adductor (Adductors)** | `50 kg x 8, 8, 8` | Progressed from `36 kg` (`Ready to Progress`) |
| **Hip Abduction (Abductors)** | `77 kg x 8, 8, 8` | Progressed from `70 kg` (`Ready to Progress`) |
| **Calf Raises** | `25 kg/side x 12, 12, 12` | 2-sec pause at bottom stretch (`Ready to Progress`) |
| **Hip Extensions** | `15 kg x 8` | Lower back/glute-ham extension; progressed from `10 kg` (`Ready to Progress`) |

### 5.5 Key UI Flows & Domain Rules

1. **Active Workout Card & Default Set Tags:**
   - When an exercise block initializes with **3 working sets**, Set 1 defaults to `RIR 1` (`1–2 RIR` primer) and Sets 2–3 default to `Fail`.
   - When an exercise block initializes with **2 working sets**, Sets 1–2 both default to `Fail`.
   - Users can tap the set tag pill on any row to cycle or pick `Warmup`, `RIR 2`, `RIR 1`, `Fail`, or `Dropset`.
2. **Type-Any-Exercise Swap Flow:**
   - Every exercise card in an active workout has a **`Swap`** button in the header.
   - Tapping **`Swap`** opens an inline search/type input:
     - Displays quick 1-tap chips for suggested or previously swapped exercises at the top.
     - Typing filters all exercises in the library with live preview of their last weight/PB.
     - If the typed text doesn't match an existing exercise, a prominent **`+ Use "[Typed Name]" as new exercise`** button creates it immediately (inheriting the current category and set count) and swaps the card to it.
   - Swapping an exercise automatically populates the card's sets with the swapped exercise's most recent logged weights and reps.
3. **Unilateral / Bilateral Mode Selector (During Workout Logging & Swap/Add):**
   - When logging a workout, every exercise card features an explicit **Mode Toggle (`Bilateral` vs. `Unilateral L/R`)** in the header (and as an option when adding or swapping an exercise).
   - Switching a block from Bilateral to Unilateral automatically maps each set's `reps` into `repsLeft` and `repsRight` so no progress is lost; switching from Unilateral to Bilateral maps `Math.min(repsLeft, repsRight)` back into `reps`.
   - When `Unilateral L/R` is selected, each set row displays `L Reps` and `R Reps` steppers side-by-side (with a `"Start L"` cue badge and an imbalance indicator if `L !== R`).
4. **Increment Steppers & Plate Math:**
   - Tapping the weight field or `+`/`-` steppers adjusts load by the active step chip (`0.5`, `1.25`, `2.25`, `2.5`, or `5 kg`), plus allows direct numeric keypad entry.
   - On `plate_per_side` exercises (Free-Weight 45° Leg Press), the row shows `65 kg/side` with a live badge `= 197 kg total (incl. 67 kg sled)`.
5. **Floating Rest Timer:**
   - Completing a set (checking the checkmark button) automatically starts or resets a non-intrusive bottom bar countdown timer (`90s`, `120s`, or `180s` quick presets, `+30s` / `-15s` buttons, audio/vibration cue when done).
6. **"Ready to Progress" Logic:**
   - An exercise earns the emerald **`Ready to Progress (+Weight)`** badge when all working sets (excluding `Warmup` and `Dropset`) in its latest session reached `>= targetRepMax` (default `8`, or `12` for Calf Raises) and for unilateral exercises both `repsLeft >= targetRepMax` and `repsRight >= targetRepMax`.
7. **Plain-Text Note Export Format:**
   - Formats any session into clean plain text:
     ```text
     Upper Session — 13 Nov 2026
     - Incline DB Chest Press: 22.5 kg x 7, 7 (fail)
     - T-Bar Row: 55 kg x 7, 6 (fail)
     - Pec Fly Machine: 63 kg x 8, 8, 6 (fail)
     - Unilateral Cable Lateral Raises: 6.8 kg x 6L/6R, 6L/6R, 6L/6R (fail)
     ```
   - Handles variable weights across sets (e.g., `Barbell Reverse Curls: 12.5 kg x 8 / 10 kg x 8, 8 (fail)`), plate-per-side notation (`65 kg/side [197 kg total] x 8, 8, 8`), and assisted bodyweight (`BW - 20.4 kg x 6, 6`).
8. **Google Drive Backup & Sync Tab:**
   - **Instant Share / Save to Google Drive:** Uses Web Share API (`navigator.share({ files })`) on mobile or file download on desktop so the user can save `workout-backup-YYYY-MM-DD.json` directly into the Google Drive app with zero API keys or secrets.
   - **Google Drive Cloud Auto-Sync (Server-Side `.env` Protected):** Any Google Drive API credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`) live strictly in `.env` on the server/host environment (excluded from Git via `.gitignore` and never bundled into the frontend JS). The frontend talks to a lightweight local/serverless `/api/drive/sync` endpoint so secrets never reach the browser or GitHub.

---

## 6. What Is Left to the Builder
- Component folder structure (`src/db/`, `src/components/`, `src/utils/`, `src/pages/`).
- Exact Tailwind color tokens and micro-animations for the rest timer and set completion checkmark.
- Service worker caching strategy details (`generateSW` via `vite-plugin-pwa`).

