import { get, set } from "idb-keyval";
import type { MatchScoutEntry, PitScoutEntry } from "./models/scoutModels.ts";

type ScoutEntry = MatchScoutEntry | PitScoutEntry;
type CloudScoutEntry = ScoutEntry & { scoutType?: "match" | "pit" };

const SYNC_QUEUE_KEY = "sync_queue";
const MATCH_SCOUTS_KEY = "strategy-board:match-scouts";
const PIT_SCOUTS_KEY = "strategy-board:pit-scouts";

const isMatchScout = (entry: ScoutEntry): entry is MatchScoutEntry =>
  "matchKey" in entry;

const getQueue = async (): Promise<ScoutEntry[]> => {
  const queue = await get<ScoutEntry[]>(SYNC_QUEUE_KEY);
  return Array.isArray(queue) ? queue : [];
};

const markSyncedInLocalStore = async (entry: ScoutEntry): Promise<void> => {
  const key = isMatchScout(entry) ? MATCH_SCOUTS_KEY : PIT_SCOUTS_KEY;
  const scouts = (await get<ScoutEntry[]>(key)) ?? [];
  const index = scouts.findIndex((scout) => scout.id === entry.id);

  if (index < 0) {
    return;
  }

  scouts[index] = {
    ...scouts[index],
    syncStatus: "synced",
    lastModifiedAt: new Date().toISOString(),
  };
  await set(key, scouts);
};

const mergeLocalScout = async (entry: CloudScoutEntry): Promise<void> => {
  const key = entry.scoutType === "match" || isMatchScout(entry)
    ? MATCH_SCOUTS_KEY
    : PIT_SCOUTS_KEY;
  const scouts = (await get<ScoutEntry[]>(key)) ?? [];
  const index = scouts.findIndex((scout) => scout.id === entry.id);
  const syncedEntry = { ...entry, syncStatus: "synced" as const };
  delete syncedEntry.scoutType;

  if (index >= 0) {
    scouts[index] = syncedEntry;
  } else {
    scouts.push(syncedEntry);
  }

  await set(key, scouts);
};

export async function queueForSync(entry: ScoutEntry): Promise<void> {
  const queue = await getQueue();
  const nextEntry = { ...entry, syncStatus: "pending" as const };
  const existingIndex = queue.findIndex((queuedEntry) => queuedEntry.id === entry.id);

  if (existingIndex >= 0) {
    queue[existingIndex] = nextEntry;
  } else {
    queue.push(nextEntry);
  }

  await set(SYNC_QUEUE_KEY, queue);
}

export async function isSynced(id: string): Promise<boolean> {
  const queue = await getQueue();
  return !queue.some((entry) => entry.id === id);
}

export async function uploadToFirebase(entry: ScoutEntry): Promise<void> {
  const cloud = await import("./cloud.ts");
  await cloud.uploadScout({
    ...entry,
    scoutType: isMatchScout(entry) ? "match" : "pit",
  });
}

export async function processSyncQueue(): Promise<void> {
  const queue = await getQueue();

  if (queue.length === 0) {
    return;
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    console.info("[Sync] Offline; scout sync queue will wait.");
    return;
  }

  const remaining: ScoutEntry[] = [];

  for (const entry of queue) {
    try {
      await uploadToFirebase(entry);
      await markSyncedInLocalStore(entry);
      console.info(`[Sync] Synced scout ${entry.id}`);
    } catch (error) {
      remaining.push(entry);
      console.error(`[Sync] Failed to sync scout ${entry.id}:`, error);
    }
  }

  await set(SYNC_QUEUE_KEY, remaining);
  window.dispatchEvent(new Event("scout:data-updated"));
}

export async function downloadScoutsFromFirebase(
  eventKey: string,
): Promise<CloudScoutEntry[]> {
  const normalizedEventKey = eventKey.trim();

  if (!normalizedEventKey) {
    return [];
  }

  const cloud = await import("./cloud.ts");
  const scouts = await cloud.downloadScouts(normalizedEventKey);

  for (const scout of scouts) {
    await mergeLocalScout(scout);
  }

  window.dispatchEvent(new Event("scout:data-updated"));
  return scouts;
}
