interface Props {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}

export default function StatCard({ label, value, sub, accent }: Props) {
  return (
    <div className="bg-surface border border-border rounded-xl px-5 py-[18px] flex flex-col gap-1">
      <span className="text-xs text-text-muted font-medium tracking-wider uppercase">
        {label}
      </span>
      <span
        className="text-[28px] font-extrabold tracking-tight leading-tight"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </span>
      {sub && <span className="text-xs text-text-faint">{sub}</span>}
    </div>
  );
}
