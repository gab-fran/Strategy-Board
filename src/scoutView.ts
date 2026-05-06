import { loadProfile } from "./auth.ts";
import type { MatchScoutEntry, PitScoutEntry } from "./models/scoutModels.ts";
import {
  getPitScoutByTeam,
  saveMatchScout,
  savePitScout,
} from "./services/scoutService.ts";

const getElement = <T extends HTMLElement>(id: string): T | null =>
  document.getElementById(id) as T | null;

const getRequiredElement = <T extends HTMLElement>(id: string): T => {
  const element = getElement<T>(id);

  if (!element) {
    throw new Error(`Missing match scout element: #${id}`);
  }

  return element;
};

const readNumber = (id: string): number | undefined => {
  const value = getRequiredElement<HTMLInputElement>(id).value.trim();

  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const readRating = (id: string): number | undefined => {
  const value = readNumber(id);

  if (value === undefined) {
    return undefined;
  }

  return Math.min(5, Math.max(1, value));
};

const readChecked = (id: string): boolean =>
  getRequiredElement<HTMLInputElement>(id).checked;

const readText = (id: string): string =>
  getRequiredElement<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    id,
  ).value.trim();

const setValue = (id: string, value: string | number | undefined): void => {
  const element =
    getElement<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(id);

  if (!element) {
    return;
  }

  element.value = value === undefined ? "" : String(value);
};

const createId = (): string => {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const setStatus = (message: string, type: "idle" | "success" | "error"): void => {
  const status = getElement<HTMLElement>("match-scout-status");
  if (!status) return;

  status.textContent = message;
  status.dataset.state = type;
  status.classList.toggle("hidden", !message);
};

const setPitStatus = (
  message: string,
  type: "idle" | "success" | "error",
): void => {
  const status = getElement<HTMLElement>("pit-scout-status");
  if (!status) return;

  status.textContent = message;
  status.dataset.state = type;
  status.classList.toggle("hidden", !message);
};

const resetMatchScoutForm = (): void => {
  getRequiredElement<HTMLFormElement>("match-scout-form").reset();
  setStatus("", "idle");
  getElement<HTMLInputElement>("match-scout-event")?.focus();
};

const resetPitScoutForm = (): void => {
  getRequiredElement<HTMLFormElement>("pit-scout-form").reset();
  setPitStatus("", "idle");
  getElement<HTMLInputElement>("pit-scout-team")?.focus();
};

const showHomeScreen = (): void => {
  for (const id of [
    "match-scout-screen",
    "pit-scout-screen",
    "teams-screen",
    "team-detail-screen",
  ]) {
    const screen = getElement<HTMLElement>(id);
    screen?.classList.add("hidden");
    screen?.setAttribute("aria-hidden", "true");
  }

  const homeScreen = getElement<HTMLElement>("home-screen");
  if (homeScreen) {
    homeScreen.classList.remove("hidden");
    homeScreen.setAttribute("aria-hidden", "false");
  }

  document.documentElement.style.backgroundColor = "#0d0d0d";
  window.dispatchEvent(new CustomEvent("app:navigate", { detail: "home" }));
};

const createMatchScoutEntry = async (): Promise<MatchScoutEntry | undefined> => {
  const profile = await loadProfile();

  if (!profile) {
    setStatus("Save your profile before scouting a match.", "error");
    return undefined;
  }

  const eventKey = readText("match-scout-event");
  const matchNumber = readText("match-scout-match");
  const teamNumber = readText("match-scout-team");

  if (!eventKey || !matchNumber || !teamNumber) {
    setStatus("Fill in event, match, and team before saving.", "error");
    return undefined;
  }

  const alliance = readText("match-scout-alliance") as "red" | "blue" | "";
  const stationValue = readText("match-scout-station");
  const station = stationValue ? Number(stationValue) : undefined;

  return {
    id: createId(),
    teamNumber,
    eventKey,
    matchKey: `${eventKey}_${matchNumber}`,
    matchNumber,
    alliance: alliance || undefined,
    station: station === 1 || station === 2 || station === 3 ? station : undefined,
    createdByTeam: profile.teamNumber,
    createdByName: profile.userName,
    createdAt: new Date().toISOString(),
    syncStatus: "pending",
    auto: {
      mobility: readChecked("match-scout-auto-mobility"),
      gamePiecesScored: readNumber("match-scout-auto-pieces"),
      points: readNumber("match-scout-auto-points"),
      notes: readText("match-scout-auto-notes"),
    },
    teleop: {
      gamePiecesScored: readNumber("match-scout-teleop-pieces"),
      points: readNumber("match-scout-teleop-points"),
      defenseRating: readRating("match-scout-defense-rating"),
      notes: readText("match-scout-teleop-notes"),
    },
    endgame: {
      climbAttempted: readChecked("match-scout-climb-attempted"),
      climbSucceeded: readChecked("match-scout-climb-succeeded"),
      climbLevel: readText("match-scout-climb-level"),
      points: readNumber("match-scout-endgame-points"),
      notes: readText("match-scout-endgame-notes"),
    },
    notes: readText("match-scout-notes"),
  };
};

const fillPitScoutForm = (entry: PitScoutEntry): void => {
  setValue("pit-scout-event", entry.eventKey);
  setValue("pit-scout-team", entry.teamNumber);
  setValue("pit-scout-drivetrain", entry.drivetrain);
  setValue("pit-scout-auto-capabilities", entry.autoCapabilities);
  setValue("pit-scout-climb-capabilities", entry.climbCapabilities);
  setValue("pit-scout-weight", entry.weight);
  setValue("pit-scout-technical-notes", entry.technicalNotes);
};

const clearPitScoutDetails = (): void => {
  setValue("pit-scout-event", "");
  setValue("pit-scout-drivetrain", "");
  setValue("pit-scout-auto-capabilities", "");
  setValue("pit-scout-climb-capabilities", "");
  setValue("pit-scout-weight", "");
  setValue("pit-scout-technical-notes", "");
};

const createPitScoutEntry = async (
  existingEntry?: PitScoutEntry,
): Promise<PitScoutEntry | undefined> => {
  const profile = await loadProfile();

  if (!profile) {
    setPitStatus("Save your profile before pit scouting.", "error");
    return undefined;
  }

  const teamNumber = readText("pit-scout-team");

  if (!teamNumber) {
    setPitStatus("Fill in the team number before saving.", "error");
    return undefined;
  }

  const now = new Date().toISOString();
  const weight = readNumber("pit-scout-weight");

  return {
    id: existingEntry?.id ?? createId(),
    teamNumber,
    eventKey: readText("pit-scout-event"),
    createdByTeam: existingEntry?.createdByTeam ?? profile.teamNumber,
    createdByName: existingEntry?.createdByName ?? profile.userName,
    createdAt: existingEntry?.createdAt ?? now,
    lastModifiedBy: existingEntry ? profile.userName : undefined,
    lastModifiedAt: existingEntry ? now : undefined,
    syncStatus: "pending",
    drivetrain: readText("pit-scout-drivetrain"),
    autoCapabilities: readText("pit-scout-auto-capabilities"),
    climbCapabilities: readText("pit-scout-climb-capabilities"),
    weight,
    technicalNotes: readText("pit-scout-technical-notes"),
  };
};

export function initMatchScout(): void {
  const form = getElement<HTMLFormElement>("match-scout-form");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("Saving scout...", "idle");

    try {
      const entry = await createMatchScoutEntry();

      if (!entry) {
        return;
      }

      await saveMatchScout(entry);
      setStatus("Match scout saved on this device.", "success");
      console.info("Saved match scout entry:", entry);
      window.dispatchEvent(new Event("scout:data-updated"));
    } catch (error) {
      console.error("Failed to save match scout:", error);
      setStatus("Could not save this scout. Try again.", "error");
    }
  });

  getElement<HTMLButtonElement>("match-scout-back-btn")?.addEventListener(
    "click",
    showHomeScreen,
  );
  getElement<HTMLButtonElement>("match-scout-new-btn")?.addEventListener(
    "click",
    resetMatchScoutForm,
  );
}

export function initPitScout(): void {
  const form = getElement<HTMLFormElement>("pit-scout-form");

  if (!form) {
    return;
  }

  let loadedEntry: PitScoutEntry | undefined;
  let loadCounter = 0;

  const teamInput = getElement<HTMLInputElement>("pit-scout-team");

  teamInput?.addEventListener("input", async () => {
    const teamNumber = teamInput.value.trim();
    const requestId = ++loadCounter;
    loadedEntry = undefined;

    if (!teamNumber) {
      setPitStatus("", "idle");
      return;
    }

    const entry = await getPitScoutByTeam(teamNumber);

    if (requestId !== loadCounter) {
      return;
    }

    loadedEntry = entry;

    if (entry) {
      fillPitScoutForm(entry);
      setPitStatus("Loaded existing pit scout for this team.", "idle");
    } else {
      clearPitScoutDetails();
      setPitStatus("No pit scout saved for this team yet.", "idle");
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setPitStatus("Saving pit scout...", "idle");

    try {
      const entry = await createPitScoutEntry(loadedEntry);

      if (!entry) {
        return;
      }

      await savePitScout(entry);
      loadedEntry = entry;
      setPitStatus("Pit scout saved on this device.", "success");
      console.info("Saved pit scout entry:", entry);
      window.dispatchEvent(new Event("scout:data-updated"));
    } catch (error) {
      console.error("Failed to save pit scout:", error);
      setPitStatus("Could not save this pit scout. Try again.", "error");
    }
  });

  getElement<HTMLButtonElement>("pit-scout-back-btn")?.addEventListener(
    "click",
    showHomeScreen,
  );
  getElement<HTMLButtonElement>("pit-scout-new-btn")?.addEventListener(
    "click",
    () => {
      loadedEntry = undefined;
      resetPitScoutForm();
    },
  );
}
