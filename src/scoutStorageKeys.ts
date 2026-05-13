import { del, get, set } from "idb-keyval";
import type { RobotScoutEntry } from "./models/scoutModels.ts";

export const ROBOT_SCOUTS_STORAGE_KEY = "strategy-board:robot-scouts";

const LEGACY_PIT_SCOUTS_STORAGE_KEY = "strategy-board:pit-scouts";

const entryTimestamp = (entry: RobotScoutEntry): number =>
  new Date(entry.lastModifiedAt ?? entry.createdAt).getTime();

/**
 * Copies merged robot scout rows from the legacy IndexedDB key into
 * `ROBOT_SCOUTS_STORAGE_KEY` and removes the legacy key.
 */
export async function ensureRobotScoutStorageMigrated(): Promise<void> {
  const legacy = await get<RobotScoutEntry[]>(LEGACY_PIT_SCOUTS_STORAGE_KEY);
  if (!Array.isArray(legacy) || legacy.length === 0) {
    return;
  }

  const current = (await get<RobotScoutEntry[]>(ROBOT_SCOUTS_STORAGE_KEY)) ?? [];
  const byId = new Map<string, RobotScoutEntry>();

  for (const entry of current) {
    byId.set(entry.id, entry);
  }

  for (const entry of legacy) {
    const existing = byId.get(entry.id);
    if (!existing || entryTimestamp(entry) >= entryTimestamp(existing)) {
      byId.set(entry.id, entry);
    }
  }

  await set(ROBOT_SCOUTS_STORAGE_KEY, [...byId.values()]);
  await del(LEGACY_PIT_SCOUTS_STORAGE_KEY);
}
