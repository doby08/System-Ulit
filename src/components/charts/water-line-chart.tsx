"use client";

/**
 * WaterLineChart — a line graph with a "water" design language:
 *   • smooth (natural-curve) series that read like rolling water
 *   • a liquid cyan→blue gradient fill that fades like depth
 *   • two drifting wave layers behind the plot for a live-water feel
 *   • a soft glow under the surface line
 * Used on the Analytics page to visualise response volume over time.
 */
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type WaterTrendPoint = { date: string; responses: number; completed: number };

interface WaterLineChartProps {
  data: WaterTrendPoint[];
  height?: number;
  /** Legend/axis labels (defaults are English). */
  labels?: { responses?: string; completed?: string; empty?: string };
}

/** Builds one smooth wave path used by the drifting background layers. */
function wavePath(width: number, height: number, amplitude: number, crests: number) {
  const step = width / (crests * 2);
  let path = `M0 ${height / 2}`;
  for (let i = 0; i < crests * 2; i += 1) {
    const x0 = i * step;
    const direction = i % 2 === 0 ? -1 : 1;
    path += ` C ${x0 + step * 0.3} ${height / 2 + direction * amplitude}, ${
      x0 + step * 0.7
    } ${height / 2 + direction * amplitude}, ${x0 + step} ${height / 2}`;
  }
  return path;
}

function DriftingWaves({ height }: { height: number }) {
  const path = useMemo(() => wavePath(1200, height, 14, 6), [height]);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden>
      <div className="water-wave absolute bottom-0 left-0 h-full w-[200%] opacity-[0.10]">
        <svg viewBox={`0 0 1200 ${height}`} preserveAspectRatio="none" className="h-full w-full">
          <path d={path} fill="#22d3ee" />
        </svg>
      </div>
      <div className="water-wave-slow absolute bottom-0 left-0 h-full w-[200%] opacity-[0.07]">
        <svg viewBox={`0 0 1200 ${height}`} preserveAspectRatio="none" className="h-full w-full">
          <path d={path} fill="#3b6bf6" />
        </svg>
      </div>
    </div>
  );
}

type TooltipEntry = { name?: string; value?: number | string; color?: string };

function WaterTooltip({
  active,
  payload,
  label,
  labels,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  labels: { responses: string; completed: string };
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-cyan-300/25 bg-[#0A1024]/95 px-3 py-2 text-xs shadow-[0_10px_30px_-12px_rgba(34,211,238,0.5)] backdrop-blur">
      <p className="mb-1 font-semibold text-white">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="flex items-center gap-2 text-slate-200">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color ?? "#22d3ee" }} />
          {entry.name}: <span className="font-semibold text-white">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

export function WaterLineChart({ data, height = 300, labels }: WaterLineChartProps) {
  const chartLabels = {
    responses: labels?.responses ?? "Responses",
    completed: labels?.completed ?? "Completed",
    empty: labels?.empty ?? "No responses in this period yet.",
  };

  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl border border-dashed border-[var(--border-subtle)] text-sm text-slate-400"
        style={{ height }}
      >
        {chartLabels.empty}
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl" style={{ height }}>
      <DriftingWaves height={height} />
      <div className="relative h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 16, right: 12, bottom: 4, left: -18 }}>
            <defs>
              <linearGradient id="waterFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.55} />
                <stop offset="45%" stopColor="#3b6bf6" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#3b6bf6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="waterDeepFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.34} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <filter id="waterGlow" x="-20%" y="-40%" width="140%" height="180%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="4 8" stroke="rgba(148,163,184,0.16)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              width={44}
            />
            <Tooltip
              cursor={{ stroke: "rgba(34,211,238,0.35)", strokeWidth: 1 }}
              content={<WaterTooltip labels={chartLabels} />}
            />
            <Area
              type="natural"
              dataKey="completed"
              name={chartLabels.completed}
              stroke="#6366f1"
              strokeWidth={1.6}
              strokeDasharray="5 5"
              fill="url(#waterDeepFill)"
              animationDuration={900}
              activeDot={{ r: 4, fill: "#6366f1", stroke: "#0A1024", strokeWidth: 2 }}
            />
            <Area
              type="natural"
              dataKey="responses"
              name={chartLabels.responses}
              stroke="#22d3ee"
              strokeWidth={2.6}
              fill="url(#waterFill)"
              filter="url(#waterGlow)"
              animationDuration={1100}
              activeDot={{ r: 5, fill: "#22d3ee", stroke: "#0A1024", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

