export type ScoutSyncStatus = "pending" | "synced" | "error";

export interface MatchScoutEntry {
  id: string;
  teamNumber: string;
  eventKey: string;
  matchKey: string;
  matchNumber?: string;
  alliance?: "red" | "blue";
  station?: 1 | 2 | 3;
  createdByTeam: string;
  createdByName: string;
  createdAt: string;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
  syncStatus: ScoutSyncStatus;
  auto: {
    points?: number;
    notes?: string;
    mobility?: boolean;
    gamePiecesScored?: number;
  };
  teleop: {
    points?: number;
    notes?: string;
    gamePiecesScored?: number;
    defenseRating?: number;
  };
  endgame: {
    climbAttempted?: boolean;
    climbSucceeded?: boolean;
    climbLevel?: string;
    points?: number;
    notes?: string;
  };
  notes: string;
}

export interface PitScoutEntry {
  id: string;
  teamNumber: string;
  eventKey: string;
  createdByTeam: string;
  createdByName: string;
  createdAt: string;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
  syncStatus: ScoutSyncStatus;
  drivetrain: string;
  autoCapabilities: string;
  climbCapabilities: string;
  weight?: number;
  photoUrl?: string;
  technicalNotes: string;
}
