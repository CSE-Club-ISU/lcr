type PillColor = 'gray' | 'green' | 'yellow' | 'orange' | 'red' | 'blue' | 'purple';

interface Props {
  label: string;
  color?: PillColor;
}

const colorMap: Record<PillColor, string> = {
  gray:   'bg-surface-alt text-text-muted border-border',
  green:  'bg-green-soft text-green border-green/30',
  yellow: 'bg-yellow-soft text-yellow border-yellow/30',
  orange: 'bg-accent-soft text-red/80 border-red/20',
  red:    'bg-red-soft text-red border-red/30',
  blue:   'bg-blue-soft text-blue border-blue/30',
  purple: 'bg-purple-soft text-purple border-purple/30',
};

export default function Pill({ label, color = 'gray' }: Props) {
  return (
    <span className={`inline-block text-[11px] font-semibold tracking-wide px-2 py-0.5 rounded-full border ${colorMap[color]}`}>
      {label}
    </span>
  );
}
