import type { MatchScoutEntry, RobotScoutEntry } from "./scoutModels.ts";

export interface TeamSummary {
  teamNumber: string;
  eventKey?: string;
  matchCount: number;
  hasRobotScout: boolean;
  averageAutoPoints: number;
  averageTeleopPoints: number;
  averageEndgamePoints: number;
  climbRate: number;
  consistency: number;
  notesSummary: string[];
  matchScouts: MatchScoutEntry[];
  robotScout?: RobotScoutEntry;
}
