interface Props {
  difficulty: string;
  setDifficulty: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  timeLimit: string;
  setTimeLimit: (v: string) => void;
}

function ButtonGroup({ label, options, selected, onSelect }: {
  label: string;
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="card p-5">
      <div className="text-xs font-semibold text-text-muted mb-3 tracking-wider uppercase">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <button
            key={o}
            onClick={() => onSelect(o)}
            className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold cursor-pointer transition-colors duration-100 ${
              o === selected
                ? 'border-[1.5px] border-accent bg-accent-soft text-accent'
                : 'border-[1.5px] border-border bg-transparent text-text-muted'
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function QueueSettings(props: Props) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <ButtonGroup label="Difficulty" options={['Easy', 'Medium', 'Hard']} selected={props.difficulty} onSelect={props.setDifficulty} />
      <ButtonGroup label="Category" options={['Any', 'Arrays', 'DP', 'Graphs']} selected={props.category} onSelect={props.setCategory} />
      <ButtonGroup label="Time Limit" options={['10 min', '20 min', '30 min']} selected={props.timeLimit} onSelect={props.setTimeLimit} />
    </div>
  );
}
