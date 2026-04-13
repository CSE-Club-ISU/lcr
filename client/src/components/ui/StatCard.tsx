interface Props {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  /**
   * Visual treatment.
   * - 'plaque' (default): no card chrome, label above Fraunces numeral. Editorial.
   * - 'card': legacy surface+border+rounded treatment for call sites that rely on it.
   */
  variant?: 'plaque' | 'card';
}

export default function StatCard({ label, value, sub, accent, variant = 'plaque' }: Props) {
  if (variant === 'card') {
    return (
      <div className="bg-surface border border-border rounded-xl px-5 py-[18px] flex flex-col gap-1">
        <span className="label-eyebrow">{label}</span>
        <span
          className="display-numeral"
          style={{ fontSize: 32, color: accent ?? 'var(--color-text)' }}
        >
          {value}
        </span>
        {sub && <span className="text-xs text-text-faint mt-1">{sub}</span>}
      </div>
    );
  }

  // 'plaque' — editorial default
  return (
    <div className="flex flex-col gap-2 py-2">
      <span className="label-eyebrow">{label}</span>
      <span
        className="display-numeral"
        style={{ fontSize: 40, color: accent ?? 'var(--color-text)' }}
      >
        {value}
      </span>
      {sub && <span className="text-[11px] text-text-faint tracking-wide">{sub}</span>}
    </div>
  );
}
