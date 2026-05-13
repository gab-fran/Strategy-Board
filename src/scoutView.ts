import { loadProfile } from "./auth.ts";
import {
  FIRSTService,
  buildScoutingEventKeyFromSelection,
  getTeamDisplayFields,
  loadSelectedFIRSTEvent,
  type FIRSTTeam,
} from "./first.ts";
import type { MatchScoutEntry, RobotScoutEntry } from "./models/scoutModels.ts";
import { can } from "./permissions.ts";
import {
  getRobotScoutByTeam,
  saveMatchScout,
  saveRobotScout,
} from "./services/scoutService.ts";

const SCOUT_TEAM_DEBOUNCE_MS = 450;

/** Set when the current event+team pair has passed FIRST roster validation for robot scout (or loaded from storage). */
let robotScoutLastValidatedTag: string | null = null;

const robotScoutValidatedTag = (eventKey: string, teamNumber: string): string =>
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

const setRobotScoutStatus = (
  message: string,
  type: "idle" | "success" | "error",
): void => {
  const status = getElement<HTMLElement>("robot-scout-status");
  if (!status) return;

  status.textContent = message;
  status.dataset.state = type;
  status.classList.toggle("hidden", !message);
};

const clearRobotScoutTeamFieldError = (): void => {
  const input = getElement<HTMLInputElement>("robot-scout-team");
  const feedback = getElement<HTMLElement>("robot-scout-team-feedback");
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
const setRobotScoutTeamFieldError = (message: string): void => {
  const input = getElement<HTMLInputElement>("robot-scout-team");
  const feedback = getElement<HTMLElement>("robot-scout-team-feedback");
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

const clearRobotScoutFirstDisplay = (): void => {
  setValue("robot-scout-team-nickname", "");
  setValue("robot-scout-team-location", "");
  setValue("robot-scout-team-school", "");
};

const clearMatchTeamNameDisplay = (): void => {
  setValue("match-scout-team-nickname", "");
};

const applyTeamDisplayFromFirst = (team: FIRSTTeam): void => {
  const d = getTeamDisplayFields(team);
  setValue("robot-scout-team-nickname", d.nickname);
  setValue("robot-scout-team-location", d.location);
  setValue("robot-scout-team-school", d.school);
};

/** Clears saved robot scout fields only (not event lock or FIRST display row). */
const clearRobotScoutSavedFieldsOnly = (): void => {
  setValue("robot-scout-drivetrain", "");
  setValue("robot-scout-auto-capabilities", "");
  setValue("robot-scout-climb-capabilities", "");
  setValue("robot-scout-weight", "");
  setValue("robot-scout-technical-notes", "");
};

const resetRobotScoutForm = (reapplyLockedEvent: () => void): void => {
  getRequiredElement<HTMLFormElement>("robot-scout-form").reset();
  robotScoutLastValidatedTag = null;
  clearRobotScoutFirstDisplay();
  clearRobotScoutTeamFieldError();
  reapplyLockedEvent();
  setRobotScoutStatus("", "idle");
  getElement<HTMLInputElement>("robot-scout-team")?.focus();
};

const showHomeScreen = (): void => {
  for (const id of [
    "match-scout-screen",
    "robot-scout-screen",
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

const fillRobotScoutForm = (entry: RobotScoutEntry): void => {
  setValue("robot-scout-team", entry.teamNumber);
  setValue("robot-scout-drivetrain", entry.drivetrain);
  setValue("robot-scout-auto-capabilities", entry.autoCapabilities);
  setValue("robot-scout-climb-capabilities", entry.climbCapabilities);
  setValue("robot-scout-weight", entry.weight);
  setValue("robot-scout-technical-notes", entry.technicalNotes);
};

const createRobotScoutEntry = async (
  existingEntry?: RobotScoutEntry,
): Promise<RobotScoutEntry | undefined> => {
  const profile = await loadProfile();

  if (!profile) {
    setRobotScoutStatus("Save your profile before robot scouting.", "error");
    return undefined;
  }

  if (!can("create-scout", profile.role)) {
    setRobotScoutStatus("Your role cannot create robot scouts.", "error");
    return undefined;
  }

  if (
    existingEntry &&
    existingEntry.createdByTeam !== profile.teamNumber &&
    !can("edit", profile.role)
  ) {
    setRobotScoutStatus("Your role cannot edit robot scouts from another team.", "error");
    return undefined;
  }

  const selected = loadSelectedFIRSTEvent();
  if (!selected) {
    setRobotScoutStatus(
      "Select an event on the home screen before robot scouting.",
      "error",
    );
    return undefined;
  }

  const eventKey = buildScoutingEventKeyFromSelection(selected);
  const teamNumber = readText("robot-scout-team");

  if (!teamNumber) {
    setRobotScoutStatus("Fill in the team number before saving.", "error");
    return undefined;
  }

  if (
    !robotScoutLastValidatedTag ||
    robotScoutLastValidatedTag !== robotScoutValidatedTag(eventKey, teamNumber)
  ) {
    setRobotScoutStatus(
      "Verify the team number against the official event roster before saving.",
      "error",
    );
    return undefined;
  }

  const now = new Date().toISOString();
  const weight = readNumber("robot-scout-weight");

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
    drivetrain: readText("robot-scout-drivetrain"),
    autoCapabilities: readText("robot-scout-auto-capabilities"),
    climbCapabilities: readText("robot-scout-climb-capabilities"),
    weight,
    technicalNotes: readText("robot-scout-technical-notes"),
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

export function initRobotScout(): void {
  const form = getElement<HTMLFormElement>("robot-scout-form");

  if (!form) {
    return;
  }

  const firstService = new FIRSTService();
  let loadedEntry: RobotScoutEntry | undefined;
  let activeValidationId = 0;
  let debTimer: ReturnType<typeof setTimeout> | undefined;

  const applyRobotScoutPermissions = async (): Promise<void> => {
    const profile = await loadProfile();
    const canCreateScout = can("create-scout", profile?.role);
    const canEditLoadedEntry =
      !loadedEntry ||
      loadedEntry.createdByTeam === profile?.teamNumber ||
      can("edit", profile?.role);

    setButtonVisible("robot-scout-save-btn", canCreateScout && canEditLoadedEntry);
  };

  const applyRobotScoutLockedEvent = (): void => {
    const eventInput = getElement<HTMLInputElement>("robot-scout-event");
    const teamField = getElement<HTMLInputElement>("robot-scout-team");
    if (!eventInput) {
      return;
    }

    const selected = loadSelectedFIRSTEvent();
    if (!selected) {
      eventInput.value = "";
      robotScoutLastValidatedTag = null;
      if (teamField) {
        teamField.disabled = true;
      }
      clearRobotScoutTeamFieldError();
      setRobotScoutStatus(
        "Select an event on the home screen before robot scouting.",
        "error",
      );
      return;
    }

    eventInput.value = selected.code.trim().toUpperCase();
    if (teamField) {
      teamField.disabled = false;
    }
    clearRobotScoutTeamFieldError();

    const status = getElement<HTMLElement>("robot-scout-status");
    if (
      status?.textContent ===
      "Select an event on the home screen before robot scouting."
    ) {
      setRobotScoutStatus("", "idle");
    }
  };

  const invalidatePendingValidation = (): void => {
    activeValidationId++;
    clearTimeout(debTimer);
  };

  const runRobotScoutTeamValidation = async (
    requestId: number,
    teamNumber: string,
  ): Promise<void> => {
    const selected = loadSelectedFIRSTEvent();

    if (!selected) {
      if (requestId !== activeValidationId) {
        return;
      }
      setRobotScoutStatus(
        "Select an event on the home screen before robot scouting.",
        "error",
      );
      return;
    }

    const eventKey = buildScoutingEventKeyFromSelection(selected);

    if (!firstService.hasCredentials()) {
      if (requestId !== activeValidationId) {
        return;
      }
      setRobotScoutStatus(
        "Configure VITE_FIRST_API_USERNAME and VITE_FIRST_API_AUTH_TOKEN to verify teams against the official FIRST API.",
        "error",
      );
      return;
    }

    if (!isCompleteTeamNumber(teamNumber)) {
      if (requestId !== activeValidationId) {
        return;
      }
      robotScoutLastValidatedTag = null;
      clearRobotScoutFirstDisplay();
      clearRobotScoutTeamFieldError();
      loadedEntry = undefined;
      setRobotScoutStatus("", "idle");
      void applyRobotScoutPermissions();
      return;
    }

    try {
      setRobotScoutStatus("Checking team on FIRST roster...", "idle");
      clearRobotScoutTeamFieldError();

      const globalTeam = await firstService.getTeamBySeasonAndNumber(
        selected.season,
        teamNumber,
      );

      if (requestId !== activeValidationId) {
        return;
      }

      if (!globalTeam) {
        setRobotScoutTeamFieldError("Invalid team.");
        clearRobotScoutFirstDisplay();
        clearRobotScoutSavedFieldsOnly();
        robotScoutLastValidatedTag = null;
        loadedEntry = undefined;
        setRobotScoutStatus("", "idle");
        void applyRobotScoutPermissions();
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
        setRobotScoutTeamFieldError(
          "This team is not registered for this event.",
        );
        clearRobotScoutFirstDisplay();
        clearRobotScoutSavedFieldsOnly();
        robotScoutLastValidatedTag = null;
        loadedEntry = undefined;
        setRobotScoutStatus("", "idle");
        void applyRobotScoutPermissions();
        return;
      }

      clearRobotScoutTeamFieldError();
      applyTeamDisplayFromFirst(eventTeam);

      const entry = await getRobotScoutByTeam(teamNumber);

      if (requestId !== activeValidationId) {
        return;
      }

      loadedEntry = entry;

      if (entry) {
        fillRobotScoutForm(entry);
        setRobotScoutStatus("Loaded existing robot scout for this team.", "idle");
      } else {
        clearRobotScoutSavedFieldsOnly();
        setRobotScoutStatus("No robot scout saved for this team yet.", "idle");
      }

      robotScoutLastValidatedTag = robotScoutValidatedTag(eventKey, teamNumber);
      void applyRobotScoutPermissions();
    } catch (error) {
      console.error("FIRST robot scout team validation failed:", error);
      if (requestId !== activeValidationId) {
        return;
      }
      robotScoutLastValidatedTag = null;
      clearRobotScoutFirstDisplay();
      clearRobotScoutTeamFieldError();
      setRobotScoutStatus(
        "Could not verify this team with the FIRST API. Check credentials and your connection.",
        "error",
      );
      void applyRobotScoutPermissions();
    }
  };

  const scheduleTeamValidation = (): void => {
    clearTimeout(debTimer);
    debTimer = setTimeout(() => {
      const requestId = ++activeValidationId;
      const currentTeam = teamInput?.value.trim() ?? "";
      void runRobotScoutTeamValidation(requestId, currentTeam);
    }, SCOUT_TEAM_DEBOUNCE_MS);
  };

  applyRobotScoutLockedEvent();
  window.addEventListener("first:event-selected", applyRobotScoutLockedEvent);
  window.addEventListener("first:event-cleared", applyRobotScoutLockedEvent);

  void applyRobotScoutPermissions();

  const teamInput = getElement<HTMLInputElement>("robot-scout-team");

  teamInput?.addEventListener("input", () => {
    const teamNumber = teamInput.value.trim();

    if (!teamNumber) {
      invalidatePendingValidation();
      clearRobotScoutFirstDisplay();
      clearRobotScoutTeamFieldError();
      robotScoutLastValidatedTag = null;
      loadedEntry = undefined;
      setRobotScoutStatus("", "idle");
      void applyRobotScoutPermissions();
      return;
    }

    clearRobotScoutTeamFieldError();
    scheduleTeamValidation();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setRobotScoutStatus("Saving robot scout...", "idle");
    clearRobotScoutTeamFieldError();

    try {
      const entry = await createRobotScoutEntry(loadedEntry);

      if (!entry) {
        void applyRobotScoutPermissions();
        return;
      }

      await saveRobotScout(entry);
      loadedEntry = entry;
      void applyRobotScoutPermissions();
      setRobotScoutStatus("Robot scout saved on this device.", "success");
      console.info("Saved robot scout entry:", entry);
      window.dispatchEvent(new Event("scout:data-updated"));
    } catch (error) {
      console.error("Failed to save robot scout:", error);
      setRobotScoutStatus("Could not save this robot scout. Try again.", "error");
    }
  });

  getElement<HTMLButtonElement>("robot-scout-back-btn")?.addEventListener(
    "click",
    showHomeScreen,
  );
  getElement<HTMLButtonElement>("robot-scout-new-btn")?.addEventListener(
    "click",
    () => {
      loadedEntry = undefined;
      resetRobotScoutForm(applyRobotScoutLockedEvent);
      void applyRobotScoutPermissions();
    },
  );
}
