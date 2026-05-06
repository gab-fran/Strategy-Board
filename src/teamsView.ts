import { buildTeamSummaries } from "./aggregate.ts";
import { loadProfile } from "./auth.ts";
import type { TeamSummary } from "./models/teamModels.ts";
import { can } from "./permissions.ts";
import { showTeamDetail } from "./teamDetailView.ts";
import { downloadScoutsFromFirebase, processSyncQueue } from "./sync.ts";
import {
  getAllMatchScouts,
  getAllPitScouts,
} from "./services/scoutService.ts";

const getElement = <T extends HTMLElement>(id: string): T | null =>
  document.getElementById(id) as T | null;

const normalizeTeamNumber = (teamNumber: string | number): string =>
  String(teamNumber).trim();

const formatNumber = (value: number): string =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const renderTeamCard = (summary: TeamSummary): string => {
  const pitScout = summary.pitScout;
  const alliances = [
    ...new Set(summary.matchScouts.map((scout) => scout.alliance).filter(Boolean)),
  ].join(", ");
  const latestNote = summary.notesSummary.at(-1);

  return `
    <article
      class="cursor-pointer rounded-[8px] border border-[#2a2a2a] bg-[#141414] p-4 transition-colors hover:border-[#555] hover:bg-[#1b1b1b]"
      role="button"
      tabindex="0"
      data-team-number="${escapeHtml(summary.teamNumber)}"
      aria-label="Open team ${escapeHtml(summary.teamNumber)} detail"
    >
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 class="text-2xl font-semibold text-[#e8e8e8]">Team ${escapeHtml(summary.teamNumber)}</h2>
          <p class="mt-1 text-sm text-[#999]">${escapeHtml(summary.eventKey ?? "No event")} ${alliances ? `- ${escapeHtml(alliances)}` : ""}</p>
        </div>
        <span class="rounded-[6px] border border-[#2a2a2a] bg-[#101010] px-3 py-2 text-sm text-[#cfcfcf]">
          ${summary.hasPitScout ? "Pit scout" : "Match only"}
        </span>
      </div>

      <dl class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div class="rounded-[6px] border border-[#242424] bg-[#101010] p-3">
          <dt class="text-xs uppercase text-[#888]">Matches</dt>
          <dd class="mt-1 text-xl font-semibold text-[#e8e8e8]">${summary.matchCount}</dd>
        </div>
        <div class="rounded-[6px] border border-[#242424] bg-[#101010] p-3">
          <dt class="text-xs uppercase text-[#888]">Auto avg</dt>
          <dd class="mt-1 text-xl font-semibold text-[#e8e8e8]">${formatNumber(summary.averageAutoPoints)}</dd>
        </div>
        <div class="rounded-[6px] border border-[#242424] bg-[#101010] p-3">
          <dt class="text-xs uppercase text-[#888]">Teleop avg</dt>
          <dd class="mt-1 text-xl font-semibold text-[#e8e8e8]">${formatNumber(summary.averageTeleopPoints)}</dd>
        </div>
        <div class="rounded-[6px] border border-[#242424] bg-[#101010] p-3">
          <dt class="text-xs uppercase text-[#888]">Endgame avg</dt>
          <dd class="mt-1 text-xl font-semibold text-[#e8e8e8]">${formatNumber(summary.averageEndgamePoints)}</dd>
        </div>
        <div class="rounded-[6px] border border-[#242424] bg-[#101010] p-3">
          <dt class="text-xs uppercase text-[#888]">Climb rate</dt>
          <dd class="mt-1 text-xl font-semibold text-[#e8e8e8]">${summary.climbRate}%</dd>
        </div>
      </dl>

      <div class="mt-4 grid gap-3 lg:grid-cols-3">
        <p class="rounded-[6px] border border-[#242424] bg-[#101010] p-3 text-sm text-[#cfcfcf]">
          <span class="block text-xs uppercase text-[#888]">Drivetrain</span>
          ${escapeHtml(pitScout?.drivetrain || "Not recorded")}
        </p>
        <p class="rounded-[6px] border border-[#242424] bg-[#101010] p-3 text-sm text-[#cfcfcf]">
          <span class="block text-xs uppercase text-[#888]">Auto capability</span>
          ${escapeHtml(pitScout?.autoCapabilities || "Not recorded")}
        </p>
        <p class="rounded-[6px] border border-[#242424] bg-[#101010] p-3 text-sm text-[#cfcfcf]">
          <span class="block text-xs uppercase text-[#888]">Climb</span>
          ${escapeHtml(pitScout?.climbCapabilities || "Not recorded")}
        </p>
      </div>

      ${
        latestNote
          ? `<p class="mt-4 text-sm leading-6 text-[#b8b8b8]">${escapeHtml(latestNote)}</p>`
          : ""
      }
    </article>
  `;
};

const showHomeScreen = (): void => {
  for (const id of ["teams-screen", "team-detail-screen"]) {
    const screen = getElement<HTMLElement>(id);
    screen?.classList.add("hidden");
    screen?.setAttribute("aria-hidden", "true");
  }

  const homeScreen = getElement<HTMLElement>("home-screen");
  homeScreen?.classList.remove("hidden");
  homeScreen?.setAttribute("aria-hidden", "false");
  document.documentElement.style.backgroundColor = "#0d0d0d";
  window.dispatchEvent(new CustomEvent("app:navigate", { detail: "home" }));
};

export function initTeamsView(): void {
  const screen = getElement<HTMLElement>("teams-screen");
  const list = getElement<HTMLElement>("teams-list");

  if (!screen || !list) {
    return;
  }

  const searchInput = getElement<HTMLInputElement>("teams-search");
  const allianceFilter = getElement<HTMLSelectElement>("teams-alliance-filter");
  const matchFilter = getElement<HTMLSelectElement>("teams-match-filter");
  const emptyState = getElement<HTMLElement>("teams-empty-state");
  const count = getElement<HTMLElement>("teams-count");
  const syncButton = getElement<HTMLButtonElement>("teams-sync-btn");

  let summaries: TeamSummary[] = [];
  let renderedSummaries: TeamSummary[] = [];

  const render = (): void => {
    const search = searchInput?.value.trim().toLowerCase() ?? "";
    const alliance = allianceFilter?.value ?? "";
    const minMatches = Number(matchFilter?.value ?? "0");

    renderedSummaries = summaries.filter((summary) => {
      const matchesSearch = summary.teamNumber.toLowerCase().includes(search);
      const matchesAlliance = alliance
        ? summary.matchScouts.some((scout) => scout.alliance === alliance)
        : true;
      const matchesCount = summary.matchCount >= minMatches;

      return matchesSearch && matchesAlliance && matchesCount;
    });

    list.innerHTML = renderedSummaries.map(renderTeamCard).join("");
    emptyState?.classList.toggle("hidden", renderedSummaries.length > 0);

    if (count) {
      count.textContent = `${renderedSummaries.length} team${renderedSummaries.length === 1 ? "" : "s"}`;
    }
  };

  const loadAndRender = async (): Promise<void> => {
    const profile = await loadProfile();

    if (!can("view-teams", profile?.role)) {
      syncButton?.classList.add("hidden");
      summaries = [];
      renderedSummaries = [];
      list.innerHTML = "";
      emptyState?.classList.remove("hidden");

      if (emptyState) {
        emptyState.textContent = "Your role cannot view team summaries.";
      }

      if (count) {
        count.textContent = "0 teams";
      }

      return;
    }

    syncButton?.classList.toggle("hidden", !can("sync", profile?.role));

    const [matchScouts, pitScouts] = await Promise.all([
      getAllMatchScouts(),
      getAllPitScouts(),
    ]);

    summaries = buildTeamSummaries(matchScouts, pitScouts);
    render();
  };

  searchInput?.addEventListener("input", render);
  allianceFilter?.addEventListener("change", render);
  matchFilter?.addEventListener("change", render);

  list.addEventListener("click", (event) => {
    const card = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-team-number]",
    );

    if (!card) {
      return;
    }

    void showTeamDetail(
      normalizeTeamNumber(card.dataset.teamNumber ?? ""),
      renderedSummaries.map((summary) => summary.teamNumber),
    );
  });

  list.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    const card = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-team-number]",
    );

    if (!card) {
      return;
    }

    event.preventDefault();
    void showTeamDetail(
      normalizeTeamNumber(card.dataset.teamNumber ?? ""),
      renderedSummaries.map((summary) => summary.teamNumber),
    );
  });

  getElement<HTMLButtonElement>("teams-back-btn")?.addEventListener(
    "click",
    showHomeScreen,
  );
  syncButton?.addEventListener("click", async () => {
    const eventKey =
      summaries.find((summary) => summary.eventKey)?.eventKey ??
      window.prompt("Event key to sync") ??
      "";

    if (!eventKey.trim()) {
      return;
    }

    syncButton.disabled = true;

    try {
      await processSyncQueue();
      await downloadScoutsFromFirebase(eventKey);
      await loadAndRender();
    } catch (error) {
      console.error("Failed to sync scouts:", error);
    } finally {
      syncButton.disabled = false;
    }
  });

  window.addEventListener("scout:data-updated", () => {
    void loadAndRender();
  });
  window.addEventListener("app:navigate", (event) => {
    if (event instanceof CustomEvent && event.detail === "teams") {
      void loadAndRender();
    }
  });

  void loadAndRender();
}
