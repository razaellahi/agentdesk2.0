import { fieldLabel, type MetricValue } from "./data";
export function LineChart({ metrics, colors }: { metrics: MetricValue[]; colors: string[] }) {
  const series = [...new Set(metrics.map((m) => m.series ?? "Metric"))];
  const max = Math.max(1, ...metrics.map((m) => m.value)),
    min = Math.min(0, ...metrics.map((m) => m.value));
  const maxPoint = Math.max(1, ...metrics.map((m, i) => m.point ?? i));
  const x = (m: MetricValue, index: number) => 20 + ((m.point ?? index) / maxPoint) * 360;
  const y = (m: MetricValue) => 145 - ((m.value - min) / (max - min)) * 130;
  return (
    <div>
      <svg
        viewBox="0 0 400 170"
        className="h-40 w-full"
        role="img"
        aria-label={metrics.map((m) => `${m.label}: ${m.value}`).join(", ")}
      >
        <line x1="20" x2="380" y1="145" y2="145" stroke="var(--border)" />
        {series.map((name, i) => {
          const values = metrics.filter((m) => (m.series ?? "Metric") === name),
            color = colors[i % colors.length];
          return (
            <g key={name}>
              <path
                d={values.map((m, index) => `${index ? "L" : "M"}${x(m, index)},${y(m)}`).join(" ")}
                fill="none"
                stroke={color}
                strokeWidth="2"
              />
              {values.map((m, index) => (
                <circle key={m.key} cx={x(m, index)} cy={y(m)} r="3" fill={color}>
                  <title>
                    {m.label}: {m.value}
                  </title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-3 text-xs">
        {series.map((name, i) => (
          <span key={name} className="flex items-center gap-1">
            <span className="size-2 rounded-full" style={{ background: colors[i % colors.length] }} />
            {fieldLabel(name)}
          </span>
        ))}
      </div>
    </div>
  );
}
