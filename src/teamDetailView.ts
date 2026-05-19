import { buildTeamSummaries, buildTeamSummary } from "./aggregate.ts";
import type { MatchScoutEntry, RobotScoutEntry } from "./models/scoutModels.ts";
import type { TeamSummary } from "./models/teamModels.ts";
import {
  getAllMatchScouts,
  getAllRobotScouts,
} from "./services/scoutService.ts";

const getElement = <T extends HTMLElement>(id: string): T | null =>
  document.getElementById(id) as T | null;

const formatNumber = (value: number): string =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const formatDate = (value: string): string => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const setText = (id: string, text: string): void => {
  const element = getElement<HTMLElement>(id);

  if (element) {
    element.textContent = text;
  }
};

const hideScreen = (id: string): void => {
  const screen = getElement<HTMLElement>(id);
  screen?.classList.add("hidden");
  screen?.setAttribute("aria-hidden", "true");
};

const showScreen = (id: string): void => {
  const screen = getElement<HTMLElement>(id);
  screen?.classList.remove("hidden");
  screen?.setAttribute("aria-hidden", "false");
};

const renderMatchHistory = (matches: MatchScoutEntry[]): string => {
  if (matches.length === 0) {
    return `<p class="rounded-[6px] border border-[#242424] bg-[#101010] p-4 text-sm text-[#999]">No match scouts recorded for this team.</p>`;
  }

  return matches
    .map((match) => {
      const alliance = match.alliance
        ? `${match.alliance}${match.station ? ` ${match.station}` : ""}`
        : "No alliance";

      return `
        <article class="rounded-[6px] border border-[#242424] bg-[#101010] p-4">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 class="text-base font-semibold text-[#e8e8e8]">
                ${escapeHtml(match.matchNumber || match.matchKey || "Match")}
              </h3>
              <p class="mt-1 text-sm text-[#999]">
                ${escapeHtml(match.eventKey || "No event")} - ${escapeHtml(alliance)}
              </p>
            </div>
            <span class="text-xs uppercase text-[#888]">${escapeHtml(formatDate(match.createdAt))}</span>
          </div>
          <dl class="mt-3 grid gap-2 sm:grid-cols-3">
            <div>
              <dt class="text-xs uppercase text-[#888]">Auto</dt>
              <dd class="text-sm font-semibold text-[#e8e8e8]">${formatNumber(match.auto.points ?? 0)}</dd>
            </div>
            <div>
              <dt class="text-xs uppercase text-[#888]">Teleop</dt>
              <dd class="text-sm font-semibold text-[#e8e8e8]">${formatNumber(match.teleop.points ?? 0)}</dd>
            </div>
            <div>
              <dt class="text-xs uppercase text-[#888]">Endgame</dt>
              <dd class="text-sm font-semibold text-[#e8e8e8]">${formatNumber(match.endgame.points ?? 0)}</dd>
            </div>
          </dl>
          ${
            match.notes
              ? `<p class="mt-3 text-sm leading-6 text-[#b8b8b8]">${escapeHtml(match.notes)}</p>`
              : ""
          }
        </article>
      `;
    })
    .join("");
};

const renderRobotScout = (robotScout: RobotScoutEntry | undefined): string => {
  if (!robotScout) {
    return `<p class="rounded-[6px] border border-[#242424] bg-[#101010] p-4 text-sm text-[#999]">No robot scout recorded for this team.</p>`;
  }

  return `
    <dl class="grid gap-3 lg:grid-cols-2">
      <div class="rounded-[6px] border border-[#242424] bg-[#101010] p-4">
        <dt class="text-xs uppercase text-[#888]">Drivetrain</dt>
        <dd class="mt-2 text-sm leading-6 text-[#cfcfcf]">${escapeHtml(robotScout.drivetrain || "Not recorded")}</dd>
      </div>
      <div class="rounded-[6px] border border-[#242424] bg-[#101010] p-4">
        <dt class="text-xs uppercase text-[#888]">Weight</dt>
        <dd class="mt-2 text-sm leading-6 text-[#cfcfcf]">${robotScout.weight !== undefined ? `${formatNumber(robotScout.weight)} lb` : "Not recorded"}</dd>
      </div>
      <div class="rounded-[6px] border border-[#242424] bg-[#101010] p-4">
        <dt class="text-xs uppercase text-[#888]">Auto capability</dt>
        <dd class="mt-2 text-sm leading-6 text-[#cfcfcf]">${escapeHtml(robotScout.autoCapabilities || "Not recorded")}</dd>
      </div>
      <div class="rounded-[6px] border border-[#242424] bg-[#101010] p-4">
        <dt class="text-xs uppercase text-[#888]">Climb</dt>
        <dd class="mt-2 text-sm leading-6 text-[#cfcfcf]">${escapeHtml(robotScout.climbCapabilities || "Not recorded")}</dd>
      </div>
    </dl>
    ${
      robotScout.technicalNotes
        ? `<p class="mt-3 rounded-[6px] border border-[#242424] bg-[#101010] p-4 text-sm leading-6 text-[#b8b8b8]">${escapeHtml(robotScout.technicalNotes)}</p>`
        : ""
    }
  `;
};

const renderSummary = (summary: TeamSummary): void => {
  setText("team-detail-title", `Team ${summary.teamNumber}`);
  setText("team-detail-subtitle", summary.eventKey ?? "No event recorded");
  setText("team-detail-auto-avg", formatNumber(summary.averageAutoPoints));
  setText("team-detail-teleop-avg", formatNumber(summary.averageTeleopPoints));
  setText("team-detail-climb-rate", `${summary.climbRate}%`);
  setText("team-detail-match-count", String(summary.matchCount));
  setText("team-detail-endgame-avg", formatNumber(summary.averageEndgamePoints));
  setText("team-detail-consistency", `${summary.consistency}%`);

  const matchHistory = getElement<HTMLElement>("team-detail-match-history");
  if (matchHistory) {
    matchHistory.innerHTML = renderMatchHistory(
      [...summary.matchScouts].sort(
        (first, second) =>
          Number(first.matchNumber ?? 0) - Number(second.matchNumber ?? 0) ||
          first.createdAt.localeCompare(second.createdAt),
      ),
    );
  }

  const robotScoutContainer = getElement<HTMLElement>("team-detail-robot-scout");
  if (robotScoutContainer) {
    robotScoutContainer.innerHTML = renderRobotScout(summary.robotScout);
  }
};

const updateNavButtons = (
  teamNumber: string,
  orderedTeamNumbers: string[],
): void => {
  const index = orderedTeamNumbers.indexOf(teamNumber);
  const previousButton = getElement<HTMLButtonElement>("team-detail-prev-btn");
  const nextButton = getElement<HTMLButtonElement>("team-detail-next-btn");

  if (previousButton) {
    previousButton.disabled = index <= 0;
    previousButton.dataset.teamNumber =
      index > 0 ? orderedTeamNumbers[index - 1] : "";
  }

  if (nextButton) {
    nextButton.disabled = index < 0 || index >= orderedTeamNumbers.length - 1;
    nextButton.dataset.teamNumber =
      index >= 0 && index < orderedTeamNumbers.length - 1
        ? orderedTeamNumbers[index + 1]
        : "";
  }
};

const showTeamsScreen = (): void => {
  hideScreen("team-detail-screen");
  showScreen("teams-screen");
  document.documentElement.style.backgroundColor = "#0d0d0d";
  window.dispatchEvent(new CustomEvent("app:navigate", { detail: "teams" }));
};

let currentOrderedTeamNumbers: string[] = [];

export async function showTeamDetail(
  teamNumber: string | number,
  orderedTeamNumbers: string[] = [],
): Promise<void> {
  const [matchScouts, robotScouts] = await Promise.all([
    getAllMatchScouts(),
    getAllRobotScouts(),
  ]);
  const summaries = buildTeamSummaries(matchScouts, robotScouts);
  const summary = buildTeamSummary(teamNumber, matchScouts, robotScouts);

  if (!summary.matchCount && !summary.hasRobotScout) {
    return;
  }

  currentOrderedTeamNumbers =
    orderedTeamNumbers.length > 0
      ? orderedTeamNumbers
      : summaries.map((team) => team.teamNumber);

  hideScreen("home-screen");
  hideScreen("home-container");
  hideScreen("match-scout-screen");
  hideScreen("robot-scout-screen");
  hideScreen("teams-screen");
  renderSummary(summary);
  updateNavButtons(summary.teamNumber, currentOrderedTeamNumbers);
  showScreen("team-detail-screen");
  document.documentElement.style.backgroundColor = "#0d0d0d";
  window.dispatchEvent(
    new CustomEvent("app:navigate", {
      detail: { route: "team-detail", teamNumber: summary.teamNumber },
    }),
  );
}

export function initTeamDetailView(): void {
  getElement<HTMLButtonElement>("team-detail-back-btn")?.addEventListener(
    "click",
    showTeamsScreen,
  );

  for (const id of ["team-detail-prev-btn", "team-detail-next-btn"]) {
    getElement<HTMLButtonElement>(id)?.addEventListener("click", (event) => {
      const teamNumber = (event.currentTarget as HTMLButtonElement).dataset
        .teamNumber;

      if (teamNumber) {
        void showTeamDetail(teamNumber, currentOrderedTeamNumbers);
      }
    });
  }

  window.addEventListener("scout:data-updated", () => {
    const title = getElement<HTMLElement>("team-detail-title");
    const screen = getElement<HTMLElement>("team-detail-screen");
    const teamNumber = title?.textContent?.replace("Team ", "").trim();

    if (teamNumber && screen && !screen.classList.contains("hidden")) {
      void showTeamDetail(teamNumber, currentOrderedTeamNumbers);
    }
  });
}
