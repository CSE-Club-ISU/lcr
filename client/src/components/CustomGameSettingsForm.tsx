import { useMemo } from "react";
import { tables } from "../module_bindings";
import type { Problem } from "../module_bindings/types";
import { useTypedTable } from "../utils/useTypedTable";
import type { RoomSettings } from "../types/roomSettings";
import ProblemPicker from "./ProblemPicker";

interface Props {
  settings: RoomSettings;
  onChange: (settings: RoomSettings) => void;
}

export default function CustomGameSettingsForm({ settings, onChange }: Props) {
  const [problems] = useTypedTable<Problem>(tables.problem);
  const approvedProblems = useMemo(
    () => problems.filter((p) => p.isApproved),
    [problems]
  );

  const selectedIds =
    settings.problemSelection.kind === "explicit"
      ? settings.problemSelection.problemIds
      : [];

  function setSelectedIds(ids: string[]) {
    onChange({
      ...settings,
      problemSelection: { kind: "explicit", problemIds: ids },
    });
  }

  function setStartingHp(hp: number) {
    onChange({ ...settings, startingHp: hp });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Problems */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Problems
        </label>
        <ProblemPicker
          problems={approvedProblems}
          selectedIds={selectedIds}
          onChange={setSelectedIds}
        />
      </div>

      {/* Starting HP */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Starting HP
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={10}
            max={999}
            value={settings.startingHp}
            onChange={(e) =>
              setStartingHp(Math.max(10, Math.min(999, Number(e.target.value))))
            }
            className="input-field w-24"
          />
          <span className="text-xs text-text-muted">
            Each player starts with this many hit points.
          </span>
        </div>
      </div>
    </div>
  );
}
