const WEEKS = 16;
const DAYS = 7;
const COLORS = ['#2E2926', '#5C4A10', '#F5C518', '#D4A017', '#C0272D'];

interface Props {
  // Map of "YYYY-MM-DD" → match count
  activityMap: Record<string, number>;
}

export default function ActivityHeatmap({ activityMap }: Props) {
  // Build 16-week grid ending today
  const today = new Date();
  const cells: number[] = [];

  for (let w = WEEKS - 1; w >= 0; w--) {
    for (let d = 0; d < DAYS; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() - (w * DAYS + (DAYS - 1 - d)));
      const key = date.toISOString().slice(0, 10);
      const count = activityMap[key] ?? 0;
      // Map count to color index: 0=none, 1=1 match, 2=2, 3=3, 4=4+
      cells.push(Math.min(count, 4));
    }
  }

  return (
    <div>
      <div className="flex gap-[3px]">
        {Array.from({ length: WEEKS }).map((_, w) => (
          <div key={w} className="flex flex-col gap-[3px]">
            {Array.from({ length: DAYS }).map((_, d) => {
              const v = cells[w * DAYS + d];
              return (
                <div
                  key={d}
                  className="w-[10px] h-[10px] rounded-sm"
                  style={{ background: COLORS[v] }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-[10px] items-center">
        <span className="text-[11px] text-text-faint">Less</span>
        {COLORS.map((c) => (
          <div key={c} className="w-[10px] h-[10px] rounded-sm" style={{ background: c }} />
        ))}
        <span className="text-[11px] text-text-faint">More</span>
      </div>
    </div>
  );
}
