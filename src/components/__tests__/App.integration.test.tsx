import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import { RestTimerBar } from '../RestTimerBar';
import { db } from '../../db/database';

describe('Gym Workout Tracker PWA UI Integration', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('renders templates, starts an Upper workout, shows live PB in Swap modal, resets Swap modal on dismiss, and swaps an exercise', async () => {
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

    // Verify Swap modal shows live PB preview in suggestions/library
    await waitFor(() => {
      expect(screen.getAllByText(/PB: 50 kg/i).length).toBeGreaterThan(0);
    });

    const input = screen.getByPlaceholderText(/Type or search exercise to swap/i);
    fireEvent.change(input, { target: { value: 'Temporary Search Query' } });

    // Dismiss modal with X button and verify state resets when reopened
    fireEvent.click(screen.getByRole('button', { name: /Close modal/i }));
    fireEvent.click(swapButtons[0]);

    const reopenedInput = screen.getByPlaceholderText(
      /Type or search exercise to swap/i
    ) as HTMLInputElement;
    expect(reopenedInput.value).toBe('');

    fireEvent.change(reopenedInput, { target: { value: 'Converging Chest Press' } });

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

  it('persists draft session notes across tab switches and allows clearing numeric inputs smoothly while typing', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Start Lower Session/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Start Lower Session/i));

    await waitFor(() => {
      expect(screen.getByText('Free-Weight 45° Leg Press')).toBeInTheDocument();
      // 65 kg/side * 2 + 67 kg sled = 197 kg total
      expect(screen.getAllByText(/= 197 kg total \(incl\. 67 kg sled\)/i).length).toBeGreaterThan(0);
    });

    // Clearing numeric input while typing should keep empty string until blur
    const weightInputs = screen.getAllByRole('spinbutton', {
      name: /Set 1 weight/i,
    }) as HTMLInputElement[];
    fireEvent.change(weightInputs[0], { target: { value: '' } });
    expect(weightInputs[0].value).toBe('');
    fireEvent.change(weightInputs[0], { target: { value: '70' } });
    expect(weightInputs[0].value).toBe('70');

    // Type draft session notes and switch tabs to Progress and back to Workout
    const notesTextarea = screen.getByLabelText(/Session Notes/i) as HTMLTextAreaElement;
    fireEvent.change(notesTextarea, {
      target: { value: 'Draft note persisted across tabs' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Progress/i }));
    await waitFor(() => {
      expect(screen.getByText(/Personal Best Directory/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /^Workout$/i }));
    await waitFor(() => {
      const restoredNotes = screen.getByLabelText(/Session Notes/i) as HTMLTextAreaElement;
      expect(restoredNotes.value).toBe('Draft note persisted across tabs');
    });

    // Complete Set 1 and verify Rest Timer starts
    const completeSetBtns = screen.getAllByRole('button', { name: /Complete set 1/i });
    fireEvent.click(completeSetBtns[0]);

    await waitFor(() => {
      expect(screen.getByRole('region', { name: /Rest Timer/i })).toBeInTheDocument();
    });

    // Complete Workout and verify plain-text log summary appears with draft note included
    fireEvent.click(screen.getByRole('button', { name: /Complete Workout/i }));

    await waitFor(() => {
      expect(screen.getByText(/Lower Session Saved!/i)).toBeInTheDocument();
      expect(screen.getByText(/Draft note persisted across tabs/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Copy as Text Log/i })).toBeInTheDocument();
    });
  });

  it('tracks wall-clock time accurately on visibilitychange and triggers vibration cue on completion', () => {
    vi.useFakeTimers();
    const vibrateSpy = vi.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateSpy,
      configurable: true,
      writable: true,
    });

    let currentRemaining: number | null = 30;
    const handleUpdate = vi.fn((next: number | null) => {
      currentRemaining = next;
    });

    const { rerender } = render(
      <RestTimerBar
        remainingSeconds={currentRemaining}
        totalSeconds={90}
        exerciseName="Incline DB Chest Press"
        onUpdateRemaining={handleUpdate}
        onSelectPreset={() => {}}
      />
    );

    // Simulate 30 seconds passing on wall clock and visibilitychange firing
    act(() => {
      vi.advanceTimersByTime(30000);
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(handleUpdate).toHaveBeenCalledWith(0);

    rerender(
      <RestTimerBar
        remainingSeconds={0}
        totalSeconds={90}
        exerciseName="Incline DB Chest Press"
        onUpdateRemaining={handleUpdate}
        onSelectPreset={() => {}}
      />
    );

    expect(screen.getByText(/REST COMPLETE!/i)).toBeInTheDocument();
    expect(vibrateSpy).toHaveBeenCalledWith([200, 100, 200]);

    vi.useRealTimers();
  });

  it('navigates across Progress, History & Notes, and Drive & Backup tabs with brand-agnostic data', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Start Lower Session/i)).toBeInTheDocument();
    });

    // Navigate to Progress tab
    fireEvent.click(screen.getByRole('button', { name: /Progress/i }));
    await waitFor(() => {
      expect(screen.getByText(/Personal Best Directory/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Free-Weight 45° Leg Press/i).length).toBeGreaterThan(0);
    });

    // Navigate to History & Notes tab
    fireEvent.click(screen.getByRole('button', { name: /History/i }));
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Copy as Text Log/i }).length).toBeGreaterThan(0);
    });

    // Navigate to Drive & Backup tab
    fireEvent.click(screen.getByRole('button', { name: /Backup/i }));
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Save \/ Share to Google Drive/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Download JSON Backup/i })
      ).toBeInTheDocument();
    });
  });
});
