import { Config } from "./config.ts";

const FIRST_API_BASE = "https://frc-api.firstinspires.org/v3.0";

export type FIRSTEvent = {
  code: string;
  name: string;
  eventType: string;
  districtCode?: string | null;
  city?: string | null;
  stateprov?: string | null;
  country?: string | null;
  dateStart?: string | null;
  dateEnd?: string | null;
  timezone?: string | null;
  address?: string | null;
};

type FIRSTEventsResponse = {
  Events?: FIRSTEvent[];
  eventCount?: number;
};

/** FRC API v3 team row; field names vary slightly by endpoint/version. */
export type FIRSTTeam = {
  teamNumber?: number;
  /** Some payloads use snake_case. */
  team_number?: number;
  nameShort?: string | null;
  nameFull?: string | null;
  name_short?: string | null;
  name_full?: string | null;
  schoolName?: string | null;
  school_name?: string | null;
  city?: string | null;
  stateProv?: string | null;
  stateprov?: string | null;
  country?: string | null;
};

/** Official samples use lowercase `teams`; other clients use `Teams`. */
type FIRSTTeamsResponse = {
  Teams?: FIRSTTeam[];
  teams?: FIRSTTeam[];
  teamCountTotal?: number;
  teamCountPage?: number;
  pageCurrent?: number;
  pageTotal?: number;
};

export type FIRSTMatchTeam = {
  teamNumber: number;
  station: string;
  dq: boolean;
};

export type FIRSTMatch = {
  description: string;
  matchNumber: number;
  tournamentLevel: string;
  teams: FIRSTMatchTeam[];
};

type FIRSTMatchesResponse = {
  Matches?: FIRSTMatch[];
};

export type SelectedFIRSTEvent = FIRSTEvent & {
  season: number;
  selectedAt: string;
};

export const SELECTED_FIRST_EVENT_KEY = "strategyhub:selectedFirstEvent";

const getApiCredentials = (): { username: string; token: string } => ({
  username: Config.firstApiUsername.trim(),
  token: Config.firstApiAuthToken.trim(),
});

/**
 * FIRST FRC API v3 teams listing does not accept eventCode and teamNumber
 * together in one request — use one filter per call and paginate when needed.
 */
const teamsQueryByTeamNumberOnly = (
  teamNumber: string,
  page: number,
): string =>
  `districtCode=&state=&teamNumber=${encodeURIComponent(teamNumber)}&page=${page}`;

const teamsQueryByEventCodeOnly = (eventCode: string, page: number): string =>
  `districtCode=&state=&eventCode=${encodeURIComponent(eventCode)}&page=${page}`;

export const buildScoutingEventKeyFromSelection = (
  selected: SelectedFIRSTEvent,
): string => `${selected.season}${selected.code}`.toLowerCase();

const normalizeTeamNumber = (value: unknown): string =>
  value === undefined || value === null ? "" : String(value).trim();

export const firstTeamRowNumber = (team: FIRSTTeam): string =>
  normalizeTeamNumber(team.teamNumber ?? team.team_number);

const teamMatchesNumber = (team: FIRSTTeam, teamNumber: string): boolean =>
  firstTeamRowNumber(team) === teamNumber;

export const getTeamDisplayFields = (
  team: FIRSTTeam,
): { nickname: string; location: string; school: string } => {
  const nickname =
    (team.nameShort && String(team.nameShort).trim()) ||
    (team.name_short && String(team.name_short).trim()) ||
    (team.nameFull && String(team.nameFull).trim()) ||
    (team.name_full && String(team.name_full).trim()) ||
    "";
  const region = [team.city, team.stateProv ?? team.stateprov]
    .map((v) => (v ? String(v).trim() : ""))
    .filter(Boolean)
    .join(", ");
  const location = [region, team.country ? String(team.country).trim() : ""]
    .filter(Boolean)
    .join(", ");
  const school =
    (team.schoolName && String(team.schoolName).trim()) ||
    (team.school_name && String(team.school_name).trim()) ||
    "";
  return { nickname, location, school };
};

const readTeamsArray = (payload: FIRSTTeamsResponse): FIRSTTeam[] => {
  if (Array.isArray(payload.teams)) {
    return payload.teams;
  }
  if (Array.isArray(payload.Teams)) {
    return payload.Teams;
  }
  return [];
};

const readPageTotal = (payload: FIRSTTeamsResponse): number => {
  if (typeof payload.pageTotal === "number" && payload.pageTotal >= 1) {
    return payload.pageTotal;
  }
  const total = payload.teamCountTotal;
  const perPage = payload.teamCountPage;
  if (
    typeof total === "number" &&
    total > 0 &&
    typeof perPage === "number" &&
    perPage > 0
  ) {
    return Math.max(1, Math.ceil(total / perPage));
  }
  return 1;
};

export const getCurrentFRCSeason = (date = new Date()): number =>
  date.getFullYear();

export class FIRSTService {
  public hasCredentials(): boolean {
    const { username, token } = getApiCredentials();
    return username.length > 0 && token.length > 0;
  }

  private async authorizedGet<T>(pathFromSeason: string): Promise<T> {
    const { username, token } = getApiCredentials();

    if (!username || !token) {
      throw new Error(
        "FIRST API credentials are not configured. Set VITE_FIRST_API_USERNAME and VITE_FIRST_API_AUTH_TOKEN.",
      );
    }

    const response = await fetch(`${FIRST_API_BASE}/${pathFromSeason}`, {
      headers: {
        Authorization: `Basic ${btoa(`${username}:${token}`)}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `FIRST API error: ${response.status} ${response.statusText}`,
      );
    }

    return (await response.json()) as T;
  }

  public async getEvents(season: number): Promise<FIRSTEvent[]> {
    const payload = await this.authorizedGet<FIRSTEventsResponse>(
      `${season}/events?eventCode=&teamNumber=&districtCode=&excludeDistrict=&weekNumber&tournamentType`,
    );
    return Array.isArray(payload.Events) ? payload.Events : [];
  }

  private async fetchTeamsPage(
    season: number,
    query: string,
  ): Promise<{ teams: FIRSTTeam[]; pageTotal: number }> {
    const payload = await this.authorizedGet<FIRSTTeamsResponse>(
      `${season}/teams?${query}`,
    );
    const teams = readTeamsArray(payload);
    return { teams, pageTotal: readPageTotal(payload) };
  }

  /** First team row globally registered for the season, or undefined if none. */
  public async getTeamBySeasonAndNumber(
    season: number,
    teamNumber: string,
  ): Promise<FIRSTTeam | undefined> {
    let page = 1;
    let pageTotal = 1;
    const maxPages = 500;
    do {
      const { teams, pageTotal: total } = await this.fetchTeamsPage(
        season,
        teamsQueryByTeamNumberOnly(teamNumber, page),
      );
      pageTotal = total;
      const found = teams.find((t) => teamMatchesNumber(t, teamNumber));
      if (found) {
        return found;
      }
      if (teams.length === 0) {
        break;
      }
      page++;
    } while (page <= pageTotal && page <= maxPages);
    return undefined;
  }

  /** Team registered for the specific FIRST event code for that season. */
  public async getTeamAtEvent(
    season: number,
    eventCode: string,
    teamNumber: string,
  ): Promise<FIRSTTeam | undefined> {
    const codes =
      eventCode === eventCode.toUpperCase()
        ? [eventCode]
        : [eventCode, eventCode.toUpperCase()];
    const uniqueCodes = [...new Set(codes)];

    const maxPages = 500;
    for (const code of uniqueCodes) {
      let page = 1;
      let pageTotal = 1;
      do {
        const { teams, pageTotal: total } = await this.fetchTeamsPage(
          season,
          teamsQueryByEventCodeOnly(code, page),
        );
        pageTotal = total;
        const found = teams.find((t) => teamMatchesNumber(t, teamNumber));
        if (found) {
          return found;
        }
        if (teams.length === 0) {
          break;
        }
        page++;
      } while (page <= pageTotal && page <= maxPages);
    }
    return undefined;
  }

  /**
   * Fetch matches for a specific team at an event.
   * tournamentLevel can be "Qualification", "Practice", "Playoff".
   */
  public async getTeamMatches(
    season: number,
    eventCode: string,
    teamNumber: string,
    tournamentLevel: string,
  ): Promise<FIRSTMatch[]> {
    try {
      const payload = await this.authorizedGet<FIRSTMatchesResponse>(
        `${season}/matches/${eventCode}?teamNumber=${teamNumber}&tournamentLevel=${tournamentLevel}`,
      );
      return Array.isArray(payload.Matches) ? payload.Matches : [];
    } catch (e) {
      console.warn("Failed to fetch matches from FIRST API", e);
      return [];
    }
  }
}

export const saveSelectedFIRSTEvent = (
  event: FIRSTEvent,
  season: number,
): SelectedFIRSTEvent => {
  const selectedEvent: SelectedFIRSTEvent = {
    ...event,
    season,
    selectedAt: new Date().toISOString(),
  };

  localStorage.setItem(
    SELECTED_FIRST_EVENT_KEY,
    JSON.stringify(selectedEvent),
  );
  (globalThis as any).strategyHubSelectedFirstEvent = selectedEvent;

  window.dispatchEvent(
    new CustomEvent("first:event-selected", { detail: selectedEvent }),
  );

  return selectedEvent;
};

export const loadSelectedFIRSTEvent = (): SelectedFIRSTEvent | undefined => {
  try {
    const raw = localStorage.getItem(SELECTED_FIRST_EVENT_KEY);
    const selectedEvent = raw ? (JSON.parse(raw) as SelectedFIRSTEvent) : undefined;
    if (selectedEvent) {
      (globalThis as any).strategyHubSelectedFirstEvent = selectedEvent;
    }
    return selectedEvent;
  } catch (error) {
    console.warn("Could not load selected FIRST event:", error);
    return undefined;
  }
};
