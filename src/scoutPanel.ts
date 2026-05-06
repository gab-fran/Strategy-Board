import { buildTeamSummary } from "./aggregate.ts";
import type { TeamSummary } from "./models/teamModels.ts";
import {
  getAllMatchScouts,
  getAllPitScouts,
} from "./services/scoutService.ts";

const PANEL_ID = "scout-panel";

let currentLoadId = 0;

const formatAverage = (value: number): string =>
  Number.isFinite(value) ? value.toFixed(1) : "0.0";

const normalizeTeamNumber = (teamNumber: string | number): string =>
  String(teamNumber).trim();

const createTextElement = (
  tagName: keyof HTMLElementTagNameMap,
  className: string,
  text: string,
): HTMLElement => {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
};

const createMetric = (label: string, value: string): HTMLElement => {
  const metric = document.createElement("div");
  metric.className = "bg-[#111111] border border-[#1e1e1e] rounded-[6px] p-3";

  metric.appendChild(
    createTextElement("div", "text-xs uppercase text-[#666] mb-1", label),
  );
  metric.appendChild(
    createTextElement("div", "text-lg font-bold text-[#e8e8e8]", value),
  );

  return metric;
};

const createTeamCard = (summary: TeamSummary): HTMLElement => {
  const card = document.createElement("div");
  card.className =
    "bg-[#141414] border border-[#1e1e1e] rounded-[6px] p-4";

  const header = document.createElement("div");
  header.className = "flex items-center justify-between gap-3 mb-3";
  header.appendChild(
    createTextElement(
      "h4",
      "text-base font-bold text-[#e8e8e8]",
      `Team ${summary.teamNumber}`,
    ),
  );
  header.appendChild(
    createTextElement(
      "span",
      "text-xs text-[#999] bg-[#111111] border border-[#1e1e1e] rounded-[6px] px-2 py-1",
      `${summary.matchCount} scout${summary.matchCount === 1 ? "" : "s"}`,
    ),
  );

  const metrics = document.createElement("div");
  metrics.className = "grid grid-cols-3 gap-2";
  metrics.appendChild(
    createMetric("Auto", formatAverage(summary.averageAutoPoints)),
  );
  metrics.appendChild(
    createMetric("Teleop", formatAverage(summary.averageTeleopPoints)),
  );
  metrics.appendChild(
    createMetric("Endgame", formatAverage(summary.averageEndgamePoints)),
  );

  card.appendChild(header);
  card.appendChild(metrics);

  return card;
};

const renderEmpty = (panel: HTMLElement): void => {
  panel.innerHTML = "";
  panel.appendChild(
    createTextElement(
      "p",
      "text-sm text-[#999] bg-[#141414] border border-[#1e1e1e] rounded-[6px] p-4",
      "Sem dados de scouting",
    ),
  );
};

const renderLoading = (panel: HTMLElement): void => {
  panel.innerHTML = "";
  panel.appendChild(
    createTextElement(
      "p",
      "text-sm text-[#666] bg-[#141414] border border-[#1e1e1e] rounded-[6px] p-4",
      "Carregando scouting...",
    ),
  );
};

const renderSummaries = (
  panel: HTMLElement,
  summaries: TeamSummary[],
): void => {
  panel.innerHTML = "";

  const section = document.createElement("section");
  section.className = "space-y-3";

  section.appendChild(
    createTextElement("h3", "text-xl font-bold text-[#e8e8e8]", "Scouting"),
  );

  const grid = document.createElement("div");
  grid.className = "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3";

  for (const summary of summaries) {
    grid.appendChild(createTeamCard(summary));
  }

  section.appendChild(grid);
  panel.appendChild(section);
};

export async function loadScoutPanel(matchTeams: number[]): Promise<void> {
  const panel = document.getElementById(PANEL_ID);
  const loadId = ++currentLoadId;

  if (!panel) {
    return;
  }

  const teamNumbers = matchTeams
    .map(normalizeTeamNumber)
    .filter((teamNumber) => teamNumber && teamNumber !== "NaN");

  if (teamNumbers.length === 0) {
    renderEmpty(panel);
    return;
  }

  renderLoading(panel);

  try {
    const [matchScouts, pitScouts] = await Promise.all([
      getAllMatchScouts(),
      getAllPitScouts(),
    ]);

    if (loadId !== currentLoadId) {
      return;
    }

    const summaries = teamNumbers
      .map((teamNumber) => buildTeamSummary(teamNumber, matchScouts, pitScouts))
      .filter((summary) => summary.matchCount > 0 || summary.hasPitScout);

    if (summaries.length === 0) {
      renderEmpty(panel);
      return;
    }

    renderSummaries(panel, summaries);
  } catch (error) {
    console.error("Failed to load scout panel:", error);

    if (loadId === currentLoadId) {
      renderEmpty(panel);
    }
  }
}
