type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';

interface Props {
  tier: Tier;
  size?: 'sm' | 'lg';
}

const tiers: Record<Tier, { color: string; bg: string; label: string }> = {
  Bronze:   { color: '#CD7F32', bg: '#FDF3E7', label: 'I' },
  Silver:   { color: '#9CA3AF', bg: '#F3F4F6', label: 'II' },
  Gold:     { color: '#B8860B', bg: '#FDF6DC', label: 'III' },
  Platinum: { color: '#06B6D4', bg: '#ECFEFF', label: 'IV' },
  Diamond:  { color: '#7C3AED', bg: '#F5F3FF', label: 'V' },
};

export default function RankBadge({ tier, size = 'sm' }: Props) {
  const t = tiers[tier] ?? tiers.Bronze;
  const sz = size === 'lg'
    ? { w: 52, h: 52, font: 11, ring: 3 }
    : { w: 32, h: 32, font: 9, ring: 2 };

  return (
    <div
      className="flex flex-col items-center justify-center rounded-full shrink-0"
      style={{
        width: sz.w,
        height: sz.h,
        background: t.bg,
        border: `${sz.ring}px solid ${t.color}`,
      }}
    >
      <span
        className="font-extrabold leading-none"
        style={{ fontSize: sz.font, color: t.color }}
      >
        {tier.slice(0, 2).toUpperCase()}
      </span>
      <span
        className="leading-none"
        style={{ fontSize: sz.font - 2, color: t.color }}
      >
        {t.label}
      </span>
    </div>
  );
}
