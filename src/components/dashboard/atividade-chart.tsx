"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const SERIES = [
  { key: "criadas", label: "Criadas", color: "var(--chart-criada)" },
  { key: "concluidas", label: "Concluídas", color: "var(--chart-concluida)" },
];

export function AtividadeChart({
  data,
}: {
  data: { label: string; criadas: number; concluidas: number }[];
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        {SERIES.map((serie) => (
          <span
            key={serie.key}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <span
              className="size-2.5 rounded-[3px]"
              style={{ backgroundColor: serie.color }}
            />
            {serie.label}
          </span>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={data}
          barGap={2}
          margin={{ top: 4, right: 4, left: 4, bottom: 0 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeWidth={1}
          />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={28}
            allowDecimals={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.5 }}
            contentStyle={{
              backgroundColor: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 13,
              color: "var(--popover-foreground)",
            }}
            labelStyle={{ color: "var(--muted-foreground)" }}
          />
          {SERIES.map((serie) => (
            <Bar
              key={serie.key}
              dataKey={serie.key}
              name={serie.label}
              fill={serie.color}
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
