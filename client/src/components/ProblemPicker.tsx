import { useState, useMemo, useRef, useEffect } from "react";
import type { Problem } from "../module_bindings/types";
import { difficultyColor } from "../utils/difficulty";

interface ProblemPickerProps {
  /** All approved problems to choose from */
  problems: Problem[];
  /** Currently selected problem IDs (in order) */
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

function difficultyLabel(d: string) {
  return d === "easy" ? "E" : d === "hard" ? "H" : "M";
}

/** Dropdown that adds a problem to the ordered selection. */
function AddProblemDropdown({
  problems,
  onAdd,
}: {
  problems: Problem[];
  onAdd: (p: Problem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return problems;
    return problems.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.difficulty.toLowerCase().includes(q)
    );
  }, [problems, query]);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function handleAdd(p: Problem) {
    onAdd(p);
    setQuery("");
    // Keep dropdown open so host can add multiple problems quickly.
    inputRef.current?.focus();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] rounded-lg border border-border bg-surface text-text-muted hover:text-text hover:bg-surface-alt cursor-pointer transition-colors"
      >
        <span className="text-accent font-bold text-base leading-none">+</span>
        Add problem
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-80 bg-surface border border-border rounded-xl shadow-lg flex flex-col overflow-hidden">
          <div className="px-3 pt-3 pb-2 border-b border-border">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search problems…"
              className="w-full bg-surface-alt border border-border rounded-lg px-3 py-1.5 text-[13px] text-text placeholder:text-text-faint outline-none focus:border-border-strong"
            />
          </div>
          <div className="overflow-y-auto max-h-64">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-[13px] text-text-muted">
                No problems found.
              </div>
            ) : (
              filtered.map((p) => (
                <button
                  key={String(p.id)}
                  type="button"
                  onClick={() => handleAdd(p)}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[13px] border-none cursor-pointer transition-colors bg-transparent text-text hover:bg-surface-alt"
                >
                  <span
                    className={`text-[10px] font-bold w-5 shrink-0 text-${difficultyColor(p.difficulty)}`}
                  >
                    {difficultyLabel(p.difficulty)}
                  </span>
                  <span className="truncate">{p.title}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Ordered list of selected problems with move up/down and remove controls. */
export default function ProblemPicker({
  problems,
  selectedIds,
  onChange,
}: ProblemPickerProps) {
  const problemMap = useMemo(() => {
    const m = new Map<string, Problem>();
    for (const p of problems) m.set(String(p.id), p);
    return m;
  }, [problems]);

  // Problems available to add (not yet in the list)
  const available = useMemo(
    () => problems.filter((p) => !selectedIds.includes(String(p.id))),
    [problems, selectedIds]
  );

  function handleAdd(p: Problem) {
    onChange([...selectedIds, String(p.id)]);
  }

  function handleRemove(idx: number) {
    onChange(selectedIds.filter((_, i) => i !== idx));
  }

  function handleMoveUp(idx: number) {
    if (idx === 0) return;
    const next = [...selectedIds];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next);
  }

  function handleMoveDown(idx: number) {
    if (idx === selectedIds.length - 1) return;
    const next = [...selectedIds];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Selected problems list */}
      {selectedIds.length > 0 && (
        <ol className="flex flex-col gap-1">
          {selectedIds.map((id, idx) => {
            const p = problemMap.get(id);
            return (
              <li
                key={id}
                className="flex items-center gap-2 px-3 py-2 bg-surface-alt rounded-lg border border-border"
              >
                <span className="text-[11px] text-text-faint w-4 text-right shrink-0 select-none">
                  {idx + 1}.
                </span>
                {p ? (
                  <>
                    <span
                      className={`text-[10px] font-bold w-4 shrink-0 text-${difficultyColor(p.difficulty)}`}
                    >
                      {difficultyLabel(p.difficulty)}
                    </span>
                    <span className="text-[13px] text-text flex-1 truncate">
                      {p.title}
                    </span>
                  </>
                ) : (
                  <span className="text-[13px] text-text-muted flex-1">
                    Unknown ({id})
                  </span>
                )}

                {/* Reorder buttons */}
                <div className="flex gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(idx)}
                    disabled={idx === 0}
                    className="px-1.5 py-0.5 text-[11px] text-text-muted hover:text-text disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer rounded transition-colors"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(idx)}
                    disabled={idx === selectedIds.length - 1}
                    className="px-1.5 py-0.5 text-[11px] text-text-muted hover:text-text disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer rounded transition-colors"
                    title="Move down"
                  >
                    ↓
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="px-1.5 py-0.5 text-[11px] text-text-muted hover:text-red cursor-pointer rounded transition-colors shrink-0"
                  title="Remove"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {selectedIds.length === 0 && (
        <p className="text-[13px] text-text-muted">
          No problems selected. Add at least one.
        </p>
      )}

      {/* Add problem dropdown */}
      <AddProblemDropdown problems={available} onAdd={handleAdd} />
    </div>
  );
}
