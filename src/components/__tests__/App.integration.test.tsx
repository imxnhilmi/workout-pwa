import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../../App';
import { db } from '../../db/database';

describe('Gym Workout Tracker PWA UI Integration', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

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

  it('calculates 45° Leg Press 67 kg sled total, starts rest timer on set completion, and completes workout', async () => {
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

    // Complete Set 1 and verify Rest Timer starts
    const completeSetBtns = screen.getAllByRole('button', { name: /Complete set 1/i });
    fireEvent.click(completeSetBtns[0]);

    await waitFor(() => {
      expect(screen.getByRole('region', { name: /Rest Timer/i })).toBeInTheDocument();
    });

    // Complete Workout and verify plain-text log summary appears
    fireEvent.click(screen.getByRole('button', { name: /Complete Workout/i }));

    await waitFor(() => {
      expect(screen.getByText(/Lower Session Saved!/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Copy as Text Log/i })).toBeInTheDocument();
    });
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
