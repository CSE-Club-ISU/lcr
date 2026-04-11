import { useMemo } from 'react';

const WEEKS = 16;
const DAYS = 7;
const COLORS = ['#2E2926', '#5C4A10', '#F5C518', '#D4A017', '#C0272D'];

export default function ActivityHeatmap() {
  const cells = useMemo(
    () =>
      Array.from({ length: WEEKS * DAYS }, () =>
        Math.random() > 0.55 ? Math.floor(Math.random() * 4) + 1 : 0,
      ),
    [],
  );

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
