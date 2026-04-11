interface Props {
  code: string;
}

export default function CodeBlock({ code }: Props) {
  const lines = code.trim().split('\n');

  return (
    <div className="font-mono text-[13px] leading-[1.7]">
      {lines.map((line, i) => (
        <div key={i} className="flex gap-4">
          <span className="text-text-faint select-none w-6 text-right shrink-0">
            {i + 1}
          </span>
          <span className="text-text whitespace-pre">{line}</span>
        </div>
      ))}
    </div>
  );
}
