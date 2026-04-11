interface Props {
  src?: string;
  username: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: 'w-8 h-8 rounded-lg text-sm',
  md: 'w-10 h-10 rounded-xl text-lg',
  lg: 'w-12 h-12 rounded-xl text-xl',
};

export default function Avatar({ src, username, size = 'md' }: Props) {
  if (src) {
    return <img src={src} alt={username} className={`${sizes[size]} object-cover shrink-0`} />;
  }

  return (
    <div
      className={`${sizes[size]} flex items-center justify-center font-extrabold text-white shrink-0`}
      style={{ background: 'linear-gradient(135deg, #C0272D, #F5C518)' }}
    >
      {username[0]?.toUpperCase() ?? '?'}
    </div>
  );
}
