import type { MatchScoutEntry, PitScoutEntry } from "./scoutModels.ts";

export interface TeamSummary {
  teamNumber: string;
  eventKey?: string;
  matchCount: number;
  hasPitScout: boolean;
  averageAutoPoints: number;
  averageTeleopPoints: number;
  averageEndgamePoints: number;
  climbRate: number;
  consistency: number;
  notesSummary: string[];
  matchScouts: MatchScoutEntry[];
  pitScout?: PitScoutEntry;
}
