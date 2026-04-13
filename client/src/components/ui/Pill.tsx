type PillColor = 'gray' | 'green' | 'yellow' | 'orange' | 'red' | 'blue' | 'purple';

interface Props {
  label: string;
  color?: PillColor;
  variant?: 'soft' | 'outline' | 'hairline';
}

const softMap: Record<PillColor, string> = {
  gray:   'bg-surface-alt text-text-muted border-[var(--color-hairline-strong)]',
  green:  'bg-green-soft text-green border-green/30',
  yellow: 'bg-yellow-soft text-yellow border-yellow/30',
  orange: 'bg-accent-soft text-red/80 border-red/20',
  red:    'bg-red-soft text-red border-red/30',
  blue:   'bg-blue-soft text-blue border-blue/30',
  purple: 'bg-purple-soft text-purple border-purple/30',
};

const textColor: Record<PillColor, string> = {
  gray:   'var(--color-text-muted)',
  green:  'var(--color-green)',
  yellow: 'var(--color-yellow)',
  orange: 'var(--color-accent)',
  red:    'var(--color-red)',
  blue:   'var(--color-blue)',
  purple: 'var(--color-purple)',
};

export default function Pill({ label, color = 'gray', variant = 'soft' }: Props) {
  if (variant === 'hairline') {
    return (
      <span
        className="inline-flex items-center mono-tabular text-[10px] uppercase tracking-[0.16em] px-2 py-0.5 rounded-sm"
        style={{
          color: textColor[color],
          border: `1px solid ${textColor[color]}`,
          background: 'transparent',
        }}
      >
        {label}
      </span>
    );
  }

  if (variant === 'outline') {
    return (
      <span
        className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md"
        style={{
          color: textColor[color],
          border: `1px solid ${textColor[color]}40`,
          background: 'transparent',
        }}
      >
        {label}
      </span>
    );
  }

  return (
    <span className={`inline-block text-[11px] font-medium tracking-wide px-2 py-0.5 rounded-full border ${softMap[color]}`}>
      {label}
    </span>
  );
}
