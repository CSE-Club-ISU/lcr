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

export function parseRoomSettings(json: string): RoomSettings {
  try {
    const raw = JSON.parse(json) as Record<string, unknown>;

    // Legacy format: { difficulty, problem_count, starting_hp }
    if (!raw.version) {
      const difficulty = (raw.difficulty as string) ?? "easy";
      const count = Number(raw.problem_count ?? 1);
      const startingHp = Number(raw.starting_hp ?? 100);
      return {
        version: 1,
        mode: "matchmaking",
        startingHp,
        problemSelection: { kind: "random", difficulty, count },
      };
    }

    return raw as unknown as RoomSettings;
  } catch {
    return defaultCustomSettings();
  }
}

export function serializeRoomSettings(settings: RoomSettings): string {
  return JSON.stringify(settings);
}
