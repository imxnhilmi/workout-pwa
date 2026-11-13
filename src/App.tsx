import { useCallback, useEffect, useState } from 'react';
import { BarChart3, Cloud, Dumbbell, FileText, ShieldCheck } from 'lucide-react';
import { ActiveWorkoutView } from './components/ActiveWorkoutView';
import { AnalyticsView } from './components/AnalyticsView';
import { DriveBackupPanel } from './components/DriveBackupPanel';
import { HistoryExportView } from './components/HistoryExportView';
import { db, ensureSeeded } from './db/database';
import type { Exercise, WorkoutSession, WorkoutTemplate } from './types/workout';

type NavTab = 'workout' | 'progress' | 'history' | 'backup';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('workout');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [isReady, setIsReady] = useState(false);

  const refreshData = useCallback(async () => {
    try {
      await ensureSeeded();
      const [exList, tmplList, sessList] = await Promise.all([
        db.exercises.toArray(),
        db.templates.toArray(),
        db.sessions.toArray(),
      ]);
      setExercises(exList);
      setTemplates(tmplList);
      setSessions(sessList);
      setIsReady(true);
    } catch {
      // Ignore if database is closed during test teardown
    }
  }, []);

  useEffect(() => {
    if (
      typeof navigator !== 'undefined' &&
      navigator.storage &&
      typeof navigator.storage.persist === 'function'
    ) {
      navigator.storage.persist().catch(() => {});
    }
    refreshData();
  }, [refreshData]);

  const activeSession = sessions.find((s) => s.status === 'active');

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-emerald-500 selection:text-zinc-950">
      {/* Top App Bar */}
      <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-zinc-950 shadow-sm">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-zinc-100">
                GymLog PWA
              </h1>
              <p className="text-[11px] text-zinc-400">
                Upper • Lower • Arms Progressive Overload
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeSession && (
              <button
                type="button"
                onClick={() => setActiveTab('workout')}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Active Session
              </button>
            )}
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Offline Ready
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="mx-auto max-w-2xl px-4 pt-4">
        {!isReady ? (
          <div className="py-12 text-center text-sm text-zinc-400">
            Loading workout database...
          </div>
        ) : (
          <>
            {activeTab === 'workout' && (
              <ActiveWorkoutView
                activeSession={activeSession}
                exercises={exercises}
                templates={templates}
                onSessionUpdated={refreshData}
              />
            )}
            {activeTab === 'progress' && <AnalyticsView exercises={exercises} />}
            {activeTab === 'history' && (
              <HistoryExportView
                sessions={sessions}
                onSessionsChanged={refreshData}
              />
            )}
            {activeTab === 'backup' && (
              <DriveBackupPanel onDataRestored={refreshData} />
            )}
          </>
        )}
      </main>

      {/* Bottom Mobile Navigation Bar */}
      <nav
        aria-label="Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-800/90 bg-zinc-950/95 backdrop-blur-md"
      >
        <div className="mx-auto grid max-w-2xl grid-cols-4 gap-1 px-2 py-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('workout')}
            className={`flex min-h-[48px] flex-col items-center justify-center rounded-xl py-1 text-xs font-semibold transition ${
              activeTab === 'workout'
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Dumbbell className="mb-0.5 h-4 w-4" />
            <span>Workout</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('progress')}
            className={`flex min-h-[48px] flex-col items-center justify-center rounded-xl py-1 text-xs font-semibold transition ${
              activeTab === 'progress'
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BarChart3 className="mb-0.5 h-4 w-4" />
            <span>Progress</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex min-h-[48px] flex-col items-center justify-center rounded-xl py-1 text-xs font-semibold transition ${
              activeTab === 'history'
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="mb-0.5 h-4 w-4" />
            <span>History &amp; Notes</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`flex min-h-[48px] flex-col items-center justify-center rounded-xl py-1 text-xs font-semibold transition ${
              activeTab === 'backup'
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Cloud className="mb-0.5 h-4 w-4" />
            <span>Drive &amp; Backup</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
