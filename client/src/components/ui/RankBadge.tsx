type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';

interface Props {
  tier: Tier;
  size?: 'sm' | 'lg';
}

/**
 * Editorial rank mark — typography-driven, dark-mode native.
 * Tier is conveyed by glyph + ring color, not a fill. Works on any surface.
 */
const tiers: Record<Tier, { color: string; glow: string; roman: string; glyph: string }> = {
  Bronze:   { color: '#B87333', glow: 'rgba(184, 115, 51, 0.16)',  roman: 'I',   glyph: 'B' },
  Silver:   { color: '#B8BDC7', glow: 'rgba(184, 189, 199, 0.12)', roman: 'II',  glyph: 'S' },
  Gold:     { color: '#F5C518', glow: 'rgba(245, 197, 24, 0.22)',  roman: 'III', glyph: 'G' },
  Platinum: { color: '#E8EDF3', glow: 'rgba(232, 237, 243, 0.18)', roman: 'IV',  glyph: 'P' },
  Diamond:  { color: '#9CD8FF', glow: 'rgba(156, 216, 255, 0.22)', roman: 'V',   glyph: 'D' },
};

export default function RankBadge({ tier, size = 'sm' }: Props) {
  const t = tiers[tier] ?? tiers.Bronze;
  const sz = size === 'lg'
    ? { w: 56, h: 56, glyph: 20, roman: 9, ring: 1 }
    : { w: 34, h: 34, glyph: 13, roman: 7, ring: 1 };

  return (
    <div
      className="flex flex-col items-center justify-center rounded-full shrink-0"
      style={{
        width: sz.w,
        height: sz.h,
        background: 'transparent',
        border: `${sz.ring}px solid ${t.color}`,
        boxShadow: `0 0 0 4px ${t.glow}`,
      }}
      title={`${tier} ${t.roman}`}
    >
      <span
        className="leading-none"
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: sz.glyph,
          fontWeight: 500,
          color: t.color,
          letterSpacing: '-0.02em',
          fontVariationSettings: '"opsz" 144',
        }}
      >
        {t.glyph}
      </span>
      <span
        className="leading-none mt-0.5"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: sz.roman,
          color: t.color,
          letterSpacing: '0.1em',
          opacity: 0.75,
        }}
      >
        {t.roman}
      </span>
    </div>
  );
}
