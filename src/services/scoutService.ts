import { get, set } from "idb-keyval";
import type { MatchScoutEntry, PitScoutEntry } from "../models/scoutModels.ts";
import { queueForSync } from "../sync.ts";

const MATCH_SCOUTS_KEY = "strategy-board:match-scouts";
const PIT_SCOUTS_KEY = "strategy-board:pit-scouts";

type SaveScoutOptions = {
  queue?: boolean;
};

const normalizeTeamNumber = (teamNumber: string | number): string =>
  String(teamNumber).trim();

export async function saveMatchScout(
  entry: MatchScoutEntry,
  options: SaveScoutOptions = {},
): Promise<void> {
  const scouts = await getAllMatchScouts();
  const existingIndex = scouts.findIndex((scout) => scout.id === entry.id);

  if (existingIndex >= 0) {
    scouts[existingIndex] = entry;
  } else {
    scouts.push(entry);
  }

  await set(MATCH_SCOUTS_KEY, scouts);

  if (options.queue !== false) {
    await queueForSync(entry);
  }
}

export async function getAllMatchScouts(): Promise<MatchScoutEntry[]> {
  const scouts = await get<MatchScoutEntry[]>(MATCH_SCOUTS_KEY);

  return Array.isArray(scouts) ? scouts : [];
}

export async function getMatchScoutsByTeam(
  teamNumber: string | number,
): Promise<MatchScoutEntry[]> {
  const normalizedTeamNumber = normalizeTeamNumber(teamNumber);
  const scouts = await getAllMatchScouts();

  return scouts.filter(
    (scout) => normalizeTeamNumber(scout.teamNumber) === normalizedTeamNumber,
  );
}

export async function savePitScout(
  entry: PitScoutEntry,
  options: SaveScoutOptions = {},
): Promise<void> {
  const scouts = await getAllPitScouts();
  const normalizedTeamNumber = normalizeTeamNumber(entry.teamNumber);
  const existingIndex = scouts.findIndex(
    (scout) => normalizeTeamNumber(scout.teamNumber) === normalizedTeamNumber,
  );

  if (existingIndex >= 0) {
    scouts[existingIndex] = entry;
  } else {
    scouts.push(entry);
  }

  await set(PIT_SCOUTS_KEY, scouts);

  if (options.queue !== false) {
    await queueForSync(entry);
  }
}

export async function getAllPitScouts(): Promise<PitScoutEntry[]> {
  const scouts = await get<PitScoutEntry[]>(PIT_SCOUTS_KEY);

  return Array.isArray(scouts) ? scouts : [];
}

export async function getPitScoutByTeam(
  teamNumber: string | number,
): Promise<PitScoutEntry | undefined> {
  const normalizedTeamNumber = normalizeTeamNumber(teamNumber);
  const scouts = await getAllPitScouts();

  return scouts.find(
    (scout) => normalizeTeamNumber(scout.teamNumber) === normalizedTeamNumber,
  );
}
