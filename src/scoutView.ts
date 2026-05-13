import { loadProfile } from "./auth.ts";
import {
  FIRSTService,
  buildScoutingEventKeyFromSelection,
  getTeamDisplayFields,
  loadSelectedFIRSTEvent,
  type FIRSTTeam,
} from "./first.ts";
import type { MatchScoutEntry, PitScoutEntry } from "./models/scoutModels.ts";
import { can } from "./permissions.ts";
import {
  getPitScoutByTeam,
  saveMatchScout,
  savePitScout,
} from "./services/scoutService.ts";

const SCOUT_TEAM_DEBOUNCE_MS = 450;

/** Set when the current event+team pair has passed FIRST roster validation (or loaded from storage). */
let pitScoutLastValidatedTag: string | null = null;

const pitScoutValidatedTag = (eventKey: string, teamNumber: string): string =>
  `${eventKey.trim()}|${teamNumber.trim()}`;

/** Set when the current event+team pair has passed FIRST roster validation for match scout. */
let matchScoutLastValidatedTag: string | null = null;

const matchScoutValidatedTag = (eventKey: string, teamNumber: string): string =>
  `${eventKey.trim()}|${teamNumber.trim()}`;

const isCompleteTeamNumber = (raw: string): boolean =>
  /^\d{1,5}$/.test(raw) && raw !== "0";

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

const clearPitTeamFieldError = (): void => {
  const input = getElement<HTMLInputElement>("pit-scout-team");
  const feedback = getElement<HTMLElement>("pit-scout-team-feedback");
  if (input) {
    input.removeAttribute("aria-invalid");
    input.style.borderColor = "";
    input.style.backgroundColor = "";
    input.style.boxShadow = "";
  }
  if (feedback) {
    feedback.textContent = "";
    feedback.classList.add("hidden");
  }
};

/** Red border + message under the team field. */
const setPitTeamFieldError = (message: string): void => {
  const input = getElement<HTMLInputElement>("pit-scout-team");
  const feedback = getElement<HTMLElement>("pit-scout-team-feedback");
  if (!input || !feedback) {
    return;
  }
  input.setAttribute("aria-invalid", "true");
  input.style.borderColor = "#dc2626";
  input.style.backgroundColor = "rgba(127, 29, 29, 0.22)";
  input.style.boxShadow = "0 0 0 1px #dc2626";
  feedback.textContent = message;
  feedback.classList.remove("hidden");
};

const clearMatchTeamFieldError = (): void => {
  const input = getElement<HTMLInputElement>("match-scout-team");
  const feedback = getElement<HTMLElement>("match-scout-team-feedback");
  if (input) {
    input.removeAttribute("aria-invalid");
    input.style.borderColor = "";
    input.style.backgroundColor = "";
    input.style.boxShadow = "";
  }
  if (feedback) {
    feedback.textContent = "";
    feedback.classList.add("hidden");
  }
};

const setMatchTeamFieldError = (message: string): void => {
  const input = getElement<HTMLInputElement>("match-scout-team");
  const feedback = getElement<HTMLElement>("match-scout-team-feedback");
  if (!input || !feedback) {
    return;
  }
  input.setAttribute("aria-invalid", "true");
  input.style.borderColor = "#dc2626";
  input.style.backgroundColor = "rgba(127, 29, 29, 0.22)";
  input.style.boxShadow = "0 0 0 1px #dc2626";
  feedback.textContent = message;
  feedback.classList.remove("hidden");
};

const setButtonVisible = (id: string, visible: boolean): void => {
  const button = getElement<HTMLButtonElement>(id);

  if (!button) {
    return;
  }

  button.classList.toggle("hidden", !visible);
  button.disabled = !visible;
};

const resetMatchScoutForm = (reapplyLockedEvent: () => void): void => {
  getRequiredElement<HTMLFormElement>("match-scout-form").reset();
  matchScoutLastValidatedTag = null;
  clearMatchTeamFieldError();
  clearMatchTeamNameDisplay();
  setStatus("", "idle");
  reapplyLockedEvent();
  getElement<HTMLInputElement>("match-scout-match")?.focus();
};

const clearPitFirstDisplay = (): void => {
  setValue("pit-scout-team-nickname", "");
  setValue("pit-scout-team-location", "");
  setValue("pit-scout-team-school", "");
};

const clearMatchTeamNameDisplay = (): void => {
  setValue("match-scout-team-nickname", "");
};

const applyTeamDisplayFromFirst = (team: FIRSTTeam): void => {
  const d = getTeamDisplayFields(team);
  setValue("pit-scout-team-nickname", d.nickname);
  setValue("pit-scout-team-location", d.location);
  setValue("pit-scout-team-school", d.school);
};

/** Clears saved pit fields only (not event lock or FIRST display row). */
const clearPitScoutSavedFieldsOnly = (): void => {
  setValue("pit-scout-drivetrain", "");
  setValue("pit-scout-auto-capabilities", "");
  setValue("pit-scout-climb-capabilities", "");
  setValue("pit-scout-weight", "");
  setValue("pit-scout-technical-notes", "");
};

const resetPitScoutForm = (reapplyLockedEvent: () => void): void => {
  getRequiredElement<HTMLFormElement>("pit-scout-form").reset();
  pitScoutLastValidatedTag = null;
  clearPitFirstDisplay();
  clearPitTeamFieldError();
  reapplyLockedEvent();
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

  if (!can("create-scout", profile.role)) {
    setStatus("Your role cannot create match scouts.", "error");
    return undefined;
  }

  const selected = loadSelectedFIRSTEvent();
  if (!selected) {
    setStatus(
      "Select an event on the home screen before match scouting.",
      "error",
    );
    return undefined;
  }

  const eventKey = buildScoutingEventKeyFromSelection(selected);
  const matchNumber = readText("match-scout-match");
  const teamNumber = readText("match-scout-team");

  if (!matchNumber || !teamNumber) {
    setStatus("Fill in match and team before saving.", "error");
    return undefined;
  }

  if (
    !matchScoutLastValidatedTag ||
    matchScoutLastValidatedTag !== matchScoutValidatedTag(eventKey, teamNumber)
  ) {
    setStatus(
      "Verify the team number against the official event roster before saving.",
      "error",
    );
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
  setValue("pit-scout-team", entry.teamNumber);
  setValue("pit-scout-drivetrain", entry.drivetrain);
  setValue("pit-scout-auto-capabilities", entry.autoCapabilities);
  setValue("pit-scout-climb-capabilities", entry.climbCapabilities);
  setValue("pit-scout-weight", entry.weight);
  setValue("pit-scout-technical-notes", entry.technicalNotes);
};

const createPitScoutEntry = async (
  existingEntry?: PitScoutEntry,
): Promise<PitScoutEntry | undefined> => {
  const profile = await loadProfile();

  if (!profile) {
    setPitStatus("Save your profile before pit scouting.", "error");
    return undefined;
  }

  if (!can("create-scout", profile.role)) {
    setPitStatus("Your role cannot create pit scouts.", "error");
    return undefined;
  }

  if (
    existingEntry &&
    existingEntry.createdByTeam !== profile.teamNumber &&
    !can("edit", profile.role)
  ) {
    setPitStatus("Your role cannot edit pit scouts from another team.", "error");
    return undefined;
  }

  const selected = loadSelectedFIRSTEvent();
  if (!selected) {
    setPitStatus(
      "Select an event on the home screen before pit scouting.",
      "error",
    );
    return undefined;
  }

  const eventKey = buildScoutingEventKeyFromSelection(selected);
  const teamNumber = readText("pit-scout-team");

  if (!teamNumber) {
    setPitStatus("Fill in the team number before saving.", "error");
    return undefined;
  }

  if (
    !pitScoutLastValidatedTag ||
    pitScoutLastValidatedTag !== pitScoutValidatedTag(eventKey, teamNumber)
  ) {
    setPitStatus(
      "Verify the team number against the official event roster before saving.",
      "error",
    );
    return undefined;
  }

  const now = new Date().toISOString();
  const weight = readNumber("pit-scout-weight");

  return {
    id: existingEntry?.id ?? createId(),
    teamNumber,
    eventKey,
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

  const firstService = new FIRSTService();
  let activeValidationId = 0;
  let debTimer: ReturnType<typeof setTimeout> | undefined;

  const invalidatePendingValidation = (): void => {
    activeValidationId++;
    clearTimeout(debTimer);
  };

  const applyMatchLockedEvent = (): void => {
    const eventInput = getElement<HTMLInputElement>("match-scout-event");
    const teamField = getElement<HTMLInputElement>("match-scout-team");
    if (!eventInput) {
      return;
    }

    const selected = loadSelectedFIRSTEvent();
    if (!selected) {
      eventInput.value = "";
      matchScoutLastValidatedTag = null;
      if (teamField) {
        teamField.disabled = true;
      }
      clearMatchTeamFieldError();
      clearMatchTeamNameDisplay();
      setStatus(
        "Select an event on the home screen before match scouting.",
        "error",
      );
      return;
    }

    eventInput.value = selected.code.trim().toUpperCase();
    if (teamField) {
      teamField.disabled = false;
    }
    clearMatchTeamFieldError();

    const status = getElement<HTMLElement>("match-scout-status");
    if (
      status?.textContent ===
      "Select an event on the home screen before match scouting."
    ) {
      setStatus("", "idle");
    }
  };

  const runMatchTeamValidation = async (
    requestId: number,
    teamNumber: string,
  ): Promise<void> => {
    const selected = loadSelectedFIRSTEvent();

    if (!selected) {
      if (requestId !== activeValidationId) {
        return;
      }
      setStatus(
        "Select an event on the home screen before match scouting.",
        "error",
      );
      return;
    }

    const eventKey = buildScoutingEventKeyFromSelection(selected);

    if (!firstService.hasCredentials()) {
      if (requestId !== activeValidationId) {
        return;
      }
      clearMatchTeamNameDisplay();
      setStatus(
        "Configure VITE_FIRST_API_USERNAME and VITE_FIRST_API_AUTH_TOKEN to verify teams against the official FIRST API.",
        "error",
      );
      return;
    }

    if (!isCompleteTeamNumber(teamNumber)) {
      if (requestId !== activeValidationId) {
        return;
      }
      matchScoutLastValidatedTag = null;
      clearMatchTeamFieldError();
      clearMatchTeamNameDisplay();
      setStatus("", "idle");
      return;
    }

    try {
      setStatus("Checking team on FIRST roster...", "idle");
      clearMatchTeamFieldError();

      const globalTeam = await firstService.getTeamBySeasonAndNumber(
        selected.season,
        teamNumber,
      );

      if (requestId !== activeValidationId) {
        return;
      }

      if (!globalTeam) {
        setMatchTeamFieldError("Invalid team.");
        matchScoutLastValidatedTag = null;
        clearMatchTeamNameDisplay();
        setStatus("", "idle");
        return;
      }

      const eventTeam = await firstService.getTeamAtEvent(
        selected.season,
        selected.code,
        teamNumber,
      );

      if (requestId !== activeValidationId) {
        return;
      }

      if (!eventTeam) {
        setMatchTeamFieldError(
          "This team is not registered for this event.",
        );
        matchScoutLastValidatedTag = null;
        clearMatchTeamNameDisplay();
        setStatus("", "idle");
        return;
      }

      clearMatchTeamFieldError();
      setValue(
        "match-scout-team-nickname",
        getTeamDisplayFields(eventTeam).nickname,
      );
      setStatus("", "idle");
      matchScoutLastValidatedTag = matchScoutValidatedTag(eventKey, teamNumber);
    } catch (error) {
      console.error("FIRST match team validation failed:", error);
      if (requestId !== activeValidationId) {
        return;
      }
      matchScoutLastValidatedTag = null;
      clearMatchTeamFieldError();
      clearMatchTeamNameDisplay();
      setStatus(
        "Could not verify this team with the FIRST API. Check credentials and your connection.",
        "error",
      );
    }
  };

  const teamInput = getElement<HTMLInputElement>("match-scout-team");

  const scheduleTeamValidation = (): void => {
    clearTimeout(debTimer);
    debTimer = setTimeout(() => {
      const requestId = ++activeValidationId;
      const currentTeam = teamInput?.value.trim() ?? "";
      void runMatchTeamValidation(requestId, currentTeam);
    }, SCOUT_TEAM_DEBOUNCE_MS);
  };

  void loadProfile().then((profile) => {
    setButtonVisible("match-scout-save-btn", can("create-scout", profile?.role));
  });

  teamInput?.addEventListener("input", () => {
    const teamNumber = teamInput.value.trim();

    if (!teamNumber) {
      invalidatePendingValidation();
      clearMatchTeamFieldError();
      clearMatchTeamNameDisplay();
      matchScoutLastValidatedTag = null;
      setStatus("", "idle");
      return;
    }

    clearMatchTeamFieldError();
    scheduleTeamValidation();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("Saving scout...", "idle");
    clearMatchTeamFieldError();

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
    () => {
      resetMatchScoutForm(applyMatchLockedEvent);
    },
  );

  applyMatchLockedEvent();
  window.addEventListener("first:event-selected", applyMatchLockedEvent);
  window.addEventListener("first:event-cleared", applyMatchLockedEvent);
}

export function initPitScout(): void {
  const form = getElement<HTMLFormElement>("pit-scout-form");

  if (!form) {
    return;
  }

  const firstService = new FIRSTService();
  let loadedEntry: PitScoutEntry | undefined;
  let activeValidationId = 0;
  let debTimer: ReturnType<typeof setTimeout> | undefined;

  const applyPitScoutPermissions = async (): Promise<void> => {
    const profile = await loadProfile();
    const canCreateScout = can("create-scout", profile?.role);
    const canEditLoadedEntry =
      !loadedEntry ||
      loadedEntry.createdByTeam === profile?.teamNumber ||
      can("edit", profile?.role);

    setButtonVisible("pit-scout-save-btn", canCreateScout && canEditLoadedEntry);
  };

  const applyPitLockedEvent = (): void => {
    const eventInput = getElement<HTMLInputElement>("pit-scout-event");
    const teamField = getElement<HTMLInputElement>("pit-scout-team");
    if (!eventInput) {
      return;
    }

    const selected = loadSelectedFIRSTEvent();
    if (!selected) {
      eventInput.value = "";
      pitScoutLastValidatedTag = null;
      if (teamField) {
        teamField.disabled = true;
      }
      clearPitTeamFieldError();
      setPitStatus(
        "Select an event on the home screen before pit scouting.",
        "error",
      );
      return;
    }

    eventInput.value = selected.code.trim().toUpperCase();
    if (teamField) {
      teamField.disabled = false;
    }
    clearPitTeamFieldError();

    const status = getElement<HTMLElement>("pit-scout-status");
    if (
      status?.textContent ===
      "Select an event on the home screen before pit scouting."
    ) {
      setPitStatus("", "idle");
    }
  };

  const invalidatePendingValidation = (): void => {
    activeValidationId++;
    clearTimeout(debTimer);
  };

  const runPitTeamValidation = async (
    requestId: number,
    teamNumber: string,
  ): Promise<void> => {
    const selected = loadSelectedFIRSTEvent();

    if (!selected) {
      if (requestId !== activeValidationId) {
        return;
      }
      setPitStatus(
        "Select an event on the home screen before pit scouting.",
        "error",
      );
      return;
    }

    const eventKey = buildScoutingEventKeyFromSelection(selected);

    if (!firstService.hasCredentials()) {
      if (requestId !== activeValidationId) {
        return;
      }
      setPitStatus(
        "Configure VITE_FIRST_API_USERNAME and VITE_FIRST_API_AUTH_TOKEN to verify teams against the official FIRST API.",
        "error",
      );
      return;
    }

    if (!isCompleteTeamNumber(teamNumber)) {
      if (requestId !== activeValidationId) {
        return;
      }
      pitScoutLastValidatedTag = null;
      clearPitFirstDisplay();
      clearPitTeamFieldError();
      loadedEntry = undefined;
      setPitStatus("", "idle");
      void applyPitScoutPermissions();
      return;
    }

    try {
      setPitStatus("Checking team on FIRST roster...", "idle");
      clearPitTeamFieldError();

      const globalTeam = await firstService.getTeamBySeasonAndNumber(
        selected.season,
        teamNumber,
      );

      if (requestId !== activeValidationId) {
        return;
      }

      if (!globalTeam) {
        setPitTeamFieldError("Invalid team.");
        clearPitFirstDisplay();
        clearPitScoutSavedFieldsOnly();
        pitScoutLastValidatedTag = null;
        loadedEntry = undefined;
        setPitStatus("", "idle");
        void applyPitScoutPermissions();
        return;
      }

      const eventTeam = await firstService.getTeamAtEvent(
        selected.season,
        selected.code,
        teamNumber,
      );

      if (requestId !== activeValidationId) {
        return;
      }

      if (!eventTeam) {
        setPitTeamFieldError(
          "This team is not registered for this event.",
        );
        clearPitFirstDisplay();
        clearPitScoutSavedFieldsOnly();
        pitScoutLastValidatedTag = null;
        loadedEntry = undefined;
        setPitStatus("", "idle");
        void applyPitScoutPermissions();
        return;
      }

      clearPitTeamFieldError();
      applyTeamDisplayFromFirst(eventTeam);

      const entry = await getPitScoutByTeam(teamNumber);

      if (requestId !== activeValidationId) {
        return;
      }

      loadedEntry = entry;

      if (entry) {
        fillPitScoutForm(entry);
        setPitStatus("Loaded existing pit scout for this team.", "idle");
      } else {
        clearPitScoutSavedFieldsOnly();
        setPitStatus("No pit scout saved for this team yet.", "idle");
      }

      pitScoutLastValidatedTag = pitScoutValidatedTag(eventKey, teamNumber);
      void applyPitScoutPermissions();
    } catch (error) {
      console.error("FIRST pit team validation failed:", error);
      if (requestId !== activeValidationId) {
        return;
      }
      pitScoutLastValidatedTag = null;
      clearPitFirstDisplay();
      clearPitTeamFieldError();
      setPitStatus(
        "Could not verify this team with the FIRST API. Check credentials and your connection.",
        "error",
      );
      void applyPitScoutPermissions();
    }
  };

  const scheduleTeamValidation = (): void => {
    clearTimeout(debTimer);
    debTimer = setTimeout(() => {
      const requestId = ++activeValidationId;
      const currentTeam = teamInput?.value.trim() ?? "";
      void runPitTeamValidation(requestId, currentTeam);
    }, SCOUT_TEAM_DEBOUNCE_MS);
  };

  applyPitLockedEvent();
  window.addEventListener("first:event-selected", applyPitLockedEvent);
  window.addEventListener("first:event-cleared", applyPitLockedEvent);

  void applyPitScoutPermissions();

  const teamInput = getElement<HTMLInputElement>("pit-scout-team");

  teamInput?.addEventListener("input", () => {
    const teamNumber = teamInput.value.trim();

    if (!teamNumber) {
      invalidatePendingValidation();
      clearPitFirstDisplay();
      clearPitTeamFieldError();
      pitScoutLastValidatedTag = null;
      loadedEntry = undefined;
      setPitStatus("", "idle");
      void applyPitScoutPermissions();
      return;
    }

    clearPitTeamFieldError();
    scheduleTeamValidation();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setPitStatus("Saving pit scout...", "idle");
    clearPitTeamFieldError();

    try {
      const entry = await createPitScoutEntry(loadedEntry);

      if (!entry) {
        void applyPitScoutPermissions();
        return;
      }

      await savePitScout(entry);
      loadedEntry = entry;
      void applyPitScoutPermissions();
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
      resetPitScoutForm(applyPitLockedEvent);
      void applyPitScoutPermissions();
    },
  );
}
