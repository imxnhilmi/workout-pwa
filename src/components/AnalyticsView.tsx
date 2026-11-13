import React, { useEffect, useMemo, useState } from 'react';
import { Award, BarChart3, Search, TrendingUp } from 'lucide-react';
import { getExerciseHistoryAndPB, type ExerciseHistoryAndPB } from '../db/database';
import type { Category, Exercise } from '../types/workout';

interface AnalyticsViewProps {
  exercises: Exercise[];
}

type MetricType = 'topWeightKg' | 'estimated1RM' | 'totalVolumeKg';

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ exercises }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | Category | 'ready'>('all');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(
    exercises[0]?.id ?? 'incline-db-chest-press'
  );
  const [metric, setMetric] = useState<MetricType>('topWeightKg');
  const [pbMap, setPbMap] = useState<Record<string, ExerciseHistoryAndPB>>({});

  useEffect(() => {
    let mounted = true;
    async function loadAllHistory() {
      try {
        const entries = await Promise.all(
          exercises.map(async (ex) => {
            const info = await getExerciseHistoryAndPB(ex.id);
            return [ex.id, info] as const;
          })
        );
        if (mounted) {
          setPbMap(Object.fromEntries(entries));
        }
      } catch {
        // Ignore if database is closed during test teardown
      }
    }
    loadAllHistory();
    return () => {
      mounted = false;
    };
  }, [exercises]);

  const filteredExercises = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return exercises.filter((ex) => {
      if (categoryFilter === 'ready') {
        if (!pbMap[ex.id]?.readyToProgress) return false;
      } else if (categoryFilter !== 'all' && ex.category !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        ex.name.toLowerCase().includes(q) ||
        (ex.notes && ex.notes.toLowerCase().includes(q))
      );
    });
  }, [exercises, searchQuery, categoryFilter, pbMap]);

  const selectedExercise =
    exercises.find((e) => e.id === selectedExerciseId) ?? exercises[0];
  const selectedStats = selectedExercise ? pbMap[selectedExercise.id] : undefined;
  const points = selectedStats?.historyPoints ?? [];

  const metricLabel: Record<MetricType, string> = {
    topWeightKg: 'Top Weight (kg)',
    estimated1RM: 'Estimated 1RM (kg)',
    totalVolumeKg: 'Total Working Volume (kg)',
  };

  // Compute SVG chart coordinates
  const chartWidth = 560;
  const chartHeight = 190;
  const padX = 44;
  const padY = 26;

  const values = points.map((p) => p[metric]);
  const minVal = values.length > 0 ? Math.min(...values) : 0;
  const maxVal = values.length > 0 ? Math.max(...values) : 100;
  const span = maxVal - minVal === 0 ? Math.max(1, maxVal * 0.2) : maxVal - minVal;

  const chartCoords = points.map((pt, idx) => {
    const x =
      points.length === 1
        ? chartWidth / 2
        : padX + (idx / (points.length - 1)) * (chartWidth - padX * 2);
    const val = pt[metric];
    const normY = (val - (minVal - span * 0.1)) / (span * 1.2);
    const y = chartHeight - padY - normY * (chartHeight - padY * 2);
    return { x, y, val, date: pt.date };
  });

  const polylinePoints = chartCoords.map((c) => `${c.x},${c.y}`).join(' ');

  return (
    <div className="space-y-6 pb-24">
      {/* Progression Chart Card */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-emerald-400">
            <BarChart3 className="h-5 w-5" />
            <h2 className="text-lg font-bold text-zinc-100">
              Progression &amp; Strength Analytics
            </h2>
          </div>

          {/* Metric Selector Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                ['topWeightKg', 'Top Weight'],
                ['estimated1RM', 'Estimated 1RM'],
                ['totalVolumeKg', 'Total Working Volume'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setMetric(key)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  metric === key
                    ? 'bg-emerald-500 text-zinc-950'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Exercise Selector Dropdown */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <select
            aria-label="Select exercise for chart"
            value={selectedExercise?.id ?? ''}
            onChange={(e) => setSelectedExerciseId(e.target.value)}
            className="w-full sm:w-auto flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm font-semibold text-zinc-100 focus:border-emerald-500 focus:outline-none"
          >
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name} ({ex.category.toUpperCase()})
              </option>
            ))}
          </select>

          {selectedStats?.pbSummary && (
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-mono font-semibold text-amber-300">
              <Award className="h-4 w-4 text-amber-400" />
              <span>PB: {selectedStats.pbSummary}</span>
            </div>
          )}
        </div>

        {/* SVG Chart */}
        <div className="mt-4 rounded-xl border border-zinc-800/90 bg-zinc-950 p-3">
          <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
            <span>{selectedExercise?.name}</span>
            <span className="font-mono text-emerald-400">{metricLabel[metric]}</span>
          </div>

          {chartCoords.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-xs text-zinc-500">
              No completed sessions logged for this exercise yet.
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="h-44 w-full overflow-visible"
              role="img"
              aria-label={`Progression chart for ${selectedExercise?.name}`}
            >
              {/* Horizontal Guide Lines */}
              {[0.2, 0.5, 0.8].map((ratio, i) => {
                const y = padY + ratio * (chartHeight - padY * 2);
                return (
                  <line
                    key={i}
                    x1={padX}
                    y1={y}
                    x2={chartWidth - padX}
                    y2={y}
                    stroke="#27272a"
                    strokeDasharray="4 4"
                  />
                );
              })}

              {/* Connecting Line */}
              {chartCoords.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={polylinePoints}
                />
              )}

              {/* Data Points */}
              {chartCoords.map((pt, idx) => (
                <g key={idx}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="5.5"
                    className="fill-emerald-400 stroke-zinc-950"
                    strokeWidth="2"
                  />
                  <text
                    x={pt.x}
                    y={pt.y - 10}
                    textAnchor="middle"
                    className="fill-zinc-200 font-mono text-[11px] font-bold"
                  >
                    {pt.val}
                  </text>
                  <text
                    x={pt.x}
                    y={chartHeight - 6}
                    textAnchor="middle"
                    className="fill-zinc-500 font-mono text-[10px]"
                  >
                    {pt.date.slice(5)}
                  </text>
                </g>
              ))}
            </svg>
          )}
        </div>
      </div>

      {/* Personal Best Directory */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-zinc-100">Personal Best Directory</h2>
          <span className="text-xs text-zinc-400">
            Showing {filteredExercises.length} of {exercises.length} exercises
          </span>
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search exercises or baseline notes..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                ['all', 'All'],
                ['upper', 'Upper'],
                ['lower', 'Lower'],
                ['arms', 'Arms'],
                ['ready', 'Ready to Progress'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setCategoryFilter(key)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  categoryFilter === key
                    ? 'bg-emerald-500 text-zinc-950'
                    : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Directory Cards Grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredExercises.map((ex) => {
            const info = pbMap[ex.id];
            return (
              <div
                key={ex.id}
                onClick={() => setSelectedExerciseId(ex.id)}
                className={`cursor-pointer rounded-2xl border p-3.5 transition ${
                  selectedExercise?.id === ex.id
                    ? 'border-emerald-500/60 bg-zinc-900'
                    : 'border-zinc-800/80 bg-zinc-900/70 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      {ex.category} • {ex.isUnilateral ? 'Unilateral L/R' : 'Bilateral'}
                    </span>
                    <h3 className="text-sm font-bold text-zinc-100">{ex.name}</h3>
                  </div>

                  {info?.readyToProgress && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                      <TrendingUp className="h-3 w-3" />
                      Ready to Progress
                    </span>
                  )}
                </div>

                <div className="mt-2 rounded-xl border border-zinc-800/80 bg-zinc-950/70 px-3 py-2 font-mono text-xs text-emerald-300">
                  {info?.pbSummary ? `PB: ${info.pbSummary}` : 'No logged sets yet'}
                </div>

                {ex.notes && (
                  <p className="mt-2 text-xs text-zinc-400">{ex.notes}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
