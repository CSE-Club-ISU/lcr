interface Props {
  value: number;
  max: number;
  color?: string;
  height?: number;
}

export default function ProgressBar({ value, max, color = '#C0272D', height = 6 }: Props) {
  const pct = Math.min(100, (value / max) * 100);

  return (
    <div className="bg-surface-alt rounded-full overflow-hidden w-full" style={{ height }}>
      <div
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}
