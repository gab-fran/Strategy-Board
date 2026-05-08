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

export type SelectedFIRSTEvent = FIRSTEvent & {
  season: number;
  selectedAt: string;
};

export const SELECTED_FIRST_EVENT_KEY = "strategyhub:selectedFirstEvent";

const getApiCredentials = (): { username: string; token: string } => ({
  username: Config.firstApiUsername.trim(),
  token: Config.firstApiAuthToken.trim(),
});

export const getCurrentFRCSeason = (date = new Date()): number =>
  date.getFullYear();

export class FIRSTService {
  public hasCredentials(): boolean {
    const { username, token } = getApiCredentials();
    return username.length > 0 && token.length > 0;
  }

  public async getEvents(season: number): Promise<FIRSTEvent[]> {
    const { username, token } = getApiCredentials();

    if (!username || !token) {
      throw new Error(
        "FIRST API credentials are not configured. Set VITE_FIRST_API_USERNAME and VITE_FIRST_API_AUTH_TOKEN.",
      );
    }

    const response = await fetch(`${FIRST_API_BASE}/${season}/events?eventCode=&teamNumber=&districtCode=&excludeDistrict=&weekNumber&tournamentType`, {
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

    const payload = (await response.json()) as FIRSTEventsResponse;
    return Array.isArray(payload.Events) ? payload.Events : [];
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
