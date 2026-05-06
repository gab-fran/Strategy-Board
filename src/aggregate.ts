import type { MatchScoutEntry, PitScoutEntry } from "./models/scoutModels.ts";
import type { TeamSummary } from "./models/teamModels.ts";

const normalizeTeamNumber = (teamNumber: string | number): string =>
  String(teamNumber).trim();

const average = (values: Array<number | undefined>): number => {
  const validValues = values.filter(
    (value): value is number => typeof value === "number",
  );

  if (validValues.length === 0) {
    return 0;
  }

  return (
    validValues.reduce((total, value) => total + value, 0) / validValues.length
  );
};

const sortTeamSummaries = (summaries: TeamSummary[]): TeamSummary[] =>
  summaries.sort(
    (first, second) =>
      Number(first.teamNumber) - Number(second.teamNumber) ||
      first.teamNumber.localeCompare(second.teamNumber),
  );

export const calcAvgAuto = (entries: MatchScoutEntry[]): number =>
  average(entries.map((entry) => entry.auto.points));

export const calcAvgTeleop = (entries: MatchScoutEntry[]): number =>
  average(entries.map((entry) => entry.teleop.points));

export const calcAvgEndgame = (entries: MatchScoutEntry[]): number =>
  average(entries.map((entry) => entry.endgame.points));

export const calcClimbRate = (entries: MatchScoutEntry[]): number => {
  const attempts = entries.filter((entry) => entry.endgame.climbAttempted).length;
  const successes = entries.filter((entry) => entry.endgame.climbSucceeded).length;

  return attempts > 0 ? Math.round((successes / attempts) * 100) : 0;
};

export const calcConsistency = (entries: MatchScoutEntry[]): number => {
  if (entries.length === 0) {
    return 0;
  }

  const pointTotals = entries
    .map(
      (entry) =>
        (entry.auto.points ?? 0) +
        (entry.teleop.points ?? 0) +
        (entry.endgame.points ?? 0),
    )
    .filter((value) => Number.isFinite(value));

  if (pointTotals.length < 2) {
    return 100;
  }

  const mean = average(pointTotals);

  if (mean === 0) {
    return 100;
  }

  const variance = average(
    pointTotals.map((value) => Math.pow(value - mean, 2)),
  );
  const coefficientOfVariation = Math.sqrt(variance) / mean;

  return Math.max(0, Math.round(100 - coefficientOfVariation * 100));
};

export const buildTeamSummary = (
  teamNumber: string | number,
  matchScouts: MatchScoutEntry[] = [],
  pitScouts: PitScoutEntry[] = [],
): TeamSummary => {
  const normalizedTeamNumber = normalizeTeamNumber(teamNumber);
  const matches = matchScouts.filter(
    (entry) => normalizeTeamNumber(entry.teamNumber) === normalizedTeamNumber,
  );
  const pitScout = pitScouts.find(
    (entry) => normalizeTeamNumber(entry.teamNumber) === normalizedTeamNumber,
  );

  return {
    teamNumber: normalizedTeamNumber,
    eventKey:
      pitScout?.eventKey || matches.find((match) => match.eventKey)?.eventKey,
    matchCount: matches.length,
    hasPitScout: Boolean(pitScout),
    averageAutoPoints: calcAvgAuto(matches),
    averageTeleopPoints: calcAvgTeleop(matches),
    averageEndgamePoints: calcAvgEndgame(matches),
    climbRate: calcClimbRate(matches),
    consistency: calcConsistency(matches),
    notesSummary: [
      ...matches.map((match) => match.notes).filter(Boolean),
      pitScout?.technicalNotes ?? "",
    ].filter(Boolean),
    matchScouts: matches,
    pitScout,
  };
};

export const buildTeamSummaries = (
  matchScouts: MatchScoutEntry[],
  pitScouts: PitScoutEntry[],
): TeamSummary[] => {
  const teamNumbers = new Set<string>();

  for (const scout of matchScouts) {
    teamNumbers.add(normalizeTeamNumber(scout.teamNumber));
  }

  for (const scout of pitScouts) {
    teamNumbers.add(normalizeTeamNumber(scout.teamNumber));
  }

  return sortTeamSummaries(
    [...teamNumbers].map((teamNumber) =>
      buildTeamSummary(teamNumber, matchScouts, pitScouts),
    ),
  );
};
