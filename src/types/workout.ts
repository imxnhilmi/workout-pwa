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
