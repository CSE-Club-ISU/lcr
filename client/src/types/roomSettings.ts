export type RoomMode = "custom" | "matchmaking";

export type ProblemSelection =
  | { kind: "explicit"; problemIds: string[] }
  | { kind: "random"; difficulty: string; count: number };

export type RoomSettings = {
  version: 1;
  mode: RoomMode;
  startingHp: number;
  problemSelection: ProblemSelection;
  // Future options can be added here as optional fields:
  // timeLimitSeconds?: number;
  // abilitiesEnabled?: boolean;
};

export function defaultCustomSettings(): RoomSettings {
  return {
    version: 1,
    mode: "custom",
    startingHp: 100,
    problemSelection: { kind: "explicit", problemIds: [] },
  };
}

export function defaultMatchmakingSettings(
  difficulty: string,
  count: number
): RoomSettings {
  return {
    version: 1,
    mode: "matchmaking",
    startingHp: 100,
    problemSelection: { kind: "random", difficulty, count },
  };
}

/** Return true if the parsed object looks like a valid RoomSettings v1. */
function isRoomSettingsV1(raw: Record<string, unknown>): raw is RoomSettings {
  return (
    raw["version"] === 1 &&
    (raw["mode"] === "custom" || raw["mode"] === "matchmaking") &&
    typeof raw["startingHp"] === "number" &&
    raw["problemSelection"] !== null &&
    typeof raw["problemSelection"] === "object"
  );
}

// Intentional inline JSON.parse: this function handles legacy format migration
// and schema validation, so it needs the raw parsed object before any fallback.
export function parseRoomSettings(json: string): RoomSettings {
  try {
    const raw = JSON.parse(json) as Record<string, unknown>;

    // Legacy format: { difficulty, problem_count, starting_hp }
    if (!raw["version"]) {
      const difficulty = (raw["difficulty"] as string) ?? "easy";
      const count = Number(raw["problem_count"] ?? 1);
      const startingHp = Number(raw["starting_hp"] ?? 100);
      return {
        version: 1,
        mode: "matchmaking",
        startingHp,
        problemSelection: { kind: "random", difficulty, count },
      };
    }

    if (isRoomSettingsV1(raw)) return raw;
    return defaultCustomSettings();
  } catch {
    return defaultCustomSettings();
  }
}

export function serializeRoomSettings(settings: RoomSettings): string {
  return JSON.stringify(settings);
}
