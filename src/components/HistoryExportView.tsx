import React, { useState } from 'react';
import { Calendar, ClipboardCheck, Copy, FileText, Trash2 } from 'lucide-react';
import { db } from '../db/database';
import { formatSessionAsText } from '../domain/textExport';
import type { WorkoutSession } from '../types/workout';

interface HistoryExportViewProps {
  sessions: WorkoutSession[];
  onSessionsChanged: () => Promise<void> | void;
}

export const HistoryExportView: React.FC<HistoryExportViewProps> = ({
  sessions,
  onSessionsChanged,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const completedSessions = [...sessions]
    .filter((s) => s.status === 'completed')
    .sort((a, b) => {
      const dateA = a.completedAt ?? a.startedAt;
      const dateB = b.completedAt ?? b.startedAt;
      return dateB.localeCompare(dateA);
    });

  const handleCopy = async (session: WorkoutSession) => {
    const formatted = formatSessionAsText(session);
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(formatted);
    }
    setCopiedId(session.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDeleteSession = async (sessionId: string) => {
    await db.sessions.delete(sessionId);
    await onSessionsChanged();
  };

  return (
    <div className="space-y-4 pb-24">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
        <div className="flex items-center gap-2 text-emerald-400">
          <FileText className="h-5 w-5" />
          <h2 className="text-lg font-bold text-zinc-100">
            Session History &amp; Plain-Text Logs
          </h2>
        </div>
        <p className="mt-1 text-xs text-zinc-400">
          Every completed workout is formatted in your clean plain-text note style with automatic 67 kg sled totals and L/R unilateral rep breakdowns.
        </p>
      </div>

      {completedSessions.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-sm text-zinc-400">
          No completed workout sessions yet.
        </div>
      ) : (
        <div className="space-y-4">
          {completedSessions.map((session) => {
            const plainText = formatSessionAsText(session);
            const dateStr = (session.completedAt ?? session.startedAt).slice(0, 10);

            return (
              <div
                key={session.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 shadow-md"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-zinc-100">
                        {session.title}
                      </h3>
                      <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-300">
                        <Calendar className="h-3 w-3 text-emerald-400" />
                        {dateStr}
                      </span>
                    </div>
                    {session.sessionNotes && (
                      <p className="mt-0.5 text-xs text-zinc-400">
                        {session.sessionNotes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(session)}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-bold text-zinc-950 hover:bg-emerald-400 active:scale-[0.99]"
                    >
                      {copiedId === session.id ? (
                        <>
                          <ClipboardCheck className="h-4 w-4" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          <span>Copy as Text Log</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteSession(session.id)}
                      className="inline-flex min-h-[38px] items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 px-2.5 text-zinc-500 hover:text-rose-400"
                      aria-label={`Delete ${session.title} on ${dateStr}`}
                      title="Delete session"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <pre className="mt-3 overflow-x-auto rounded-xl border border-zinc-800/90 bg-zinc-950 p-3.5 font-mono text-xs leading-relaxed text-zinc-200 whitespace-pre-wrap">
                  {plainText}
                </pre>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
