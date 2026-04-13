interface Props {
  src?: string;
  username: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  ring?: boolean;
}

const sizes = {
  sm:   'w-8 h-8 rounded-md text-[13px]',
  md:   'w-10 h-10 rounded-lg text-[15px]',
  lg:   'w-12 h-12 rounded-lg text-lg',
  xl:   'w-16 h-16 rounded-xl text-2xl',
  hero: 'w-24 h-24 rounded-2xl text-4xl',
};

export default function Avatar({ src, username, size = 'md', ring = false }: Props) {
  const ringStyle = ring
    ? { boxShadow: '0 0 0 1px var(--color-hairline-gold), 0 0 0 5px rgba(245, 197, 24, 0.06)' }
    : undefined;

  if (src) {
    return (
      <img
        src={src}
        alt={username}
        className={`${sizes[size]} object-cover shrink-0`}
        style={ringStyle}
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} flex items-center justify-center font-semibold text-text shrink-0`}
      style={{
        background: 'var(--color-surface-alt)',
        border: '1px solid var(--color-hairline-strong)',
        fontFamily: 'var(--font-serif)',
        fontWeight: 500,
        letterSpacing: '-0.02em',
        ...ringStyle,
      }}
    >
      {username[0]?.toUpperCase() ?? '?'}
    </div>
  );
}
