import { loadProfile } from "./auth.ts";
import {
  FIRSTService,
  type FIRSTEvent,
  getCurrentFRCSeason,
  loadSelectedFIRSTEvent,
  saveSelectedFIRSTEvent,
} from "./first.ts";
import { can } from "./permissions.ts";

type HomeViewOptions = {
  activeEventKey?: string;
  strategyBoardElementId?: string;
};

const moduleScreenIds = [
  "home-screen",
  "home-container",
  "match-scout-screen",
  "robot-scout-screen",
  "teams-screen",
  "team-detail-screen",
  "whiteboard-container",
];

const getElement = <T extends HTMLElement>(id: string): T | null =>
  document.getElementById(id) as T | null;

export class HomeView {
  private homeScreen: HTMLElement;
  private strategyBoardElementId: string;
  private firstService = new FIRSTService();
  private events: FIRSTEvent[] = [];
  private selectedSeason = getCurrentFRCSeason();

  constructor(options: HomeViewOptions = {}) {
    const homeScreen = getElement<HTMLElement>("home-screen");

    if (!homeScreen) {
      throw new Error("Missing home screen element: #home-screen");
    }

    this.homeScreen = homeScreen;
    this.strategyBoardElementId =
      options.strategyBoardElementId ?? "home-container";

    const savedEvent = loadSelectedFIRSTEvent();
    this.setActiveEvent(savedEvent?.code ?? options.activeEventKey);
    this.updateLastEvent(savedEvent);
    this.updateConnectionStatus();
    this.bindEvents();
    void this.applyPermissions();
    void this.loadEvents();
  }

  public showHome(): void {
    this.hideModuleScreens();
    this.homeScreen.classList.remove("hidden");
    this.homeScreen.setAttribute("aria-hidden", "false");
    document.documentElement.style.backgroundColor = "#0d0d0d";
  }

  public hideHome(): void {
    this.homeScreen.classList.add("hidden");
    this.homeScreen.setAttribute("aria-hidden", "true");
  }

  public setActiveEvent(eventKey?: string): void {
    const badge = getElement<HTMLElement>("home-active-event-badge");
    if (!badge) return;

    badge.textContent = eventKey?.trim() ? `Selected: ${eventKey}` : "No active event";
  }

  private bindEvents(): void {
    getElement<HTMLButtonElement>("home-open-strategy-board-btn")?.addEventListener(
      "click",
      () => this.openStrategyBoard(),
    );
    getElement<HTMLButtonElement>("home-open-scouting-btn")?.addEventListener(
      "click",
      () => this.openModuleScreen("match-scout-screen", "match-scout"),
    );
    getElement<HTMLButtonElement>("home-open-robot-scout-btn")?.addEventListener(
      "click",
      () => this.openModuleScreen("robot-scout-screen", "robot-scout"),
    );
    getElement<HTMLButtonElement>("home-open-teams-btn")?.addEventListener(
      "click",
      () => this.openModuleScreen("teams-screen", "teams"),
    );
    getElement<HTMLInputElement>("home-event-search")?.addEventListener(
      "input",
      () => this.renderEvents(),
    );
    getElement<HTMLButtonElement>("home-change-event-btn")?.addEventListener(
      "click",
      () => this.clearSelectedEvent(),
    );
    getElement<HTMLInputElement>("home-season-filter")?.addEventListener(
      "change",
      (event) => {
        const value = Number((event.currentTarget as HTMLInputElement).value);
        if (Number.isInteger(value) && value >= 1992) {
          this.selectedSeason = value;
          void this.loadEvents();
        }
      },
    );
    getElement<HTMLButtonElement>("home-refresh-events-btn")?.addEventListener(
      "click",
      () => {
        this.syncSeasonFromInput();
        void this.loadEvents();
      },
    );

    window.addEventListener("online", () => this.updateConnectionStatus());
    window.addEventListener("offline", () => this.updateConnectionStatus());
  }

  private async applyPermissions(): Promise<void> {
    const profile = await loadProfile();

    getElement<HTMLButtonElement>("home-open-strategy-board-btn")?.classList.toggle(
      "hidden",
      !can("view-strategy-board", profile?.role),
    );
    getElement<HTMLButtonElement>("home-open-teams-btn")?.classList.toggle(
      "hidden",
      !can("view-teams", profile?.role),
    );
    getElement<HTMLButtonElement>("home-open-scouting-btn")?.classList.toggle(
      "hidden",
      !can("create-scout", profile?.role),
    );
    getElement<HTMLButtonElement>("home-open-robot-scout-btn")?.classList.toggle(
      "hidden",
      !can("create-scout", profile?.role),
    );
  }

  private openStrategyBoard(): void {
    this.hideModuleScreens();
    const boardHome = getElement<HTMLElement>(this.strategyBoardElementId);
    boardHome?.classList.remove("hidden");
    document.documentElement.style.backgroundColor = "#192334";
    window.dispatchEvent(new CustomEvent("app:navigate", { detail: "strategy-board" }));
  }

  private openModuleScreen(screenId: string, route: string): void {
    const screen = getElement<HTMLElement>(screenId);

    if (screen) {
      this.hideModuleScreens();
      screen.classList.remove("hidden");
      screen.setAttribute("aria-hidden", "false");
      document.documentElement.style.backgroundColor = "#0d0d0d";
      window.dispatchEvent(new CustomEvent("app:navigate", { detail: route }));
      return;
    }

    const status = getElement<HTMLElement>("home-module-status");
    if (status) {
      status.textContent = "Scouting will be enabled in the next implementation phase.";
      status.classList.remove("hidden");
    }
  }

  private async loadEvents(): Promise<void> {
    this.syncSeasonFromInput();
    const seasonInput = getElement<HTMLInputElement>("home-season-filter");
    if (seasonInput) {
      seasonInput.value = String(this.selectedSeason);
    }

    this.setFeedback("Loading official FIRST events...", "idle");
    this.setResultsCount("Loading official events...");
    this.setRefreshButtonLoading(true);

    try {
      this.events = await this.firstService.getEvents(this.selectedSeason);
      this.setFeedback("", "idle");
      this.renderEvents();
    } catch (error) {
      console.error("Failed to load FIRST events:", error);
      this.events = [];
      this.renderEvents();
      const credentialHint = this.firstService.hasCredentials()
        ? ""
        : " Configure VITE_FIRST_API_USERNAME and VITE_FIRST_API_AUTH_TOKEN to enable the official FIRST API.";
      this.setFeedback(
        `We could not load FIRST events right now.${credentialHint}`,
        "error",
      );
    } finally {
      this.setRefreshButtonLoading(false);
    }
  }

  private syncSeasonFromInput(): void {
    const seasonInput = getElement<HTMLInputElement>("home-season-filter");
    const value = Number(seasonInput?.value);

    if (Number.isInteger(value) && value >= 1992) {
      this.selectedSeason = value;
    }
  }

  private renderEvents(): void {
    const list = getElement<HTMLElement>("home-event-list");
    if (!list) return;

    const query =
      getElement<HTMLInputElement>("home-event-search")?.value.trim().toLowerCase() ??
      "";
    const filteredEvents = this.events.filter((event) => {
      const searchable = [
        event.name,
        event.city,
        event.stateprov,
        event.country,
        event.code,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });

    this.setResultsCount(
      `${filteredEvents.length} event${filteredEvents.length === 1 ? "" : "s"} found`,
    );

    if (this.events.length === 0) {
      list.replaceChildren();
      if (!getElement<HTMLElement>("home-event-feedback")?.textContent) {
        this.setFeedback("No events were found for this season.", "empty");
      }
      return;
    }

    if (filteredEvents.length === 0) {
      list.replaceChildren();
      this.setFeedback("No events match your search.", "empty");
      return;
    }

    this.setFeedback("", "idle");
    list.replaceChildren(
      ...filteredEvents.map((event) => this.createEventCard(event)),
    );
  }

  private clearSelectedEvent(): void {
    localStorage.removeItem("strategyhub:selectedFirstEvent");
    (globalThis as any).strategyHubSelectedFirstEvent = undefined;
    window.dispatchEvent(new Event("first:event-cleared"));
    this.setActiveEvent(undefined);
    this.updateLastEvent(undefined);
    this.showHome();
  }

  private createEventCard(event: FIRSTEvent): HTMLButtonElement {
    const card = document.createElement("button");
    const isPast = this.isPastEvent(event);

    card.type = "button";
    card.className =
      "flex min-h-48 flex-col items-start gap-4 rounded-[8px] border border-[#2a2a2a] bg-[#141414] p-5 text-left transition-colors hover:border-[#666] hover:bg-[#1b1b1b]";
    card.dataset.eventCode = event.code;
    card.setAttribute(
      "aria-label",
      `Select ${event.name} for scouting`,
    );

    const statusBadge = isPast
      ? '<span class="rounded-[6px] border border-[#3a3426] bg-[#201b12] px-2 py-1 text-xs font-medium text-[#f0c36a]">Completed</span>'
      : '<span class="rounded-[6px] border border-[#24372d] bg-[#122018] px-2 py-1 text-xs font-medium text-[#72d694]">Upcoming</span>';

    card.innerHTML = `
      <div class="flex w-full items-start justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold leading-tight text-[#f2f2f2]">
            <span class="text-[#888] font-normal">[${this.escape(event.code)}]</span> ${this.escape(event.name)}
          </h2>
        </div>
        ${statusBadge}
      </div>
      <dl class="grid w-full gap-3 text-sm text-[#bdbdbd]">
        <div>
          <dt class="text-xs uppercase tracking-wide text-[#777]">Location</dt>
          <dd>${this.escape(this.formatLocation(event))}</dd>
        </div>
        <div>
          <dt class="text-xs uppercase tracking-wide text-[#777]">Date</dt>
          <dd>${this.escape(this.formatDateRange(event))}</dd>
        </div>
        <div>
          <dt class="text-xs uppercase tracking-wide text-[#777]">Type</dt>
          <dd>${this.escape(event.eventType || "Event")}</dd>
        </div>
      </dl>
    `;

    card.addEventListener("click", () => this.selectEvent(event));
    return card;
  }

  private selectEvent(event: FIRSTEvent): void {
    const selectedEvent = saveSelectedFIRSTEvent(event, this.selectedSeason);

    this.setActiveEvent(event.code);
    this.updateLastEvent(selectedEvent);
    this.prefillScoutingEvent(event.code);
    this.showHome();
  }

  private prefillScoutingEvent(eventCode: string): void {
    const display = eventCode.trim().toUpperCase();
    const matchInput = getElement<HTMLInputElement>("match-scout-event");
    if (matchInput) {
      matchInput.value = display;
    }
    const robotScoutEventInput = getElement<HTMLInputElement>("robot-scout-event");
    if (robotScoutEventInput) {
      robotScoutEventInput.value = display;
    }
  }

  private updateLastEvent(event?: { name?: string; eventCode?: string }): void {
    const lastEvent = getElement<HTMLElement>("home-last-event");
    if (!lastEvent) return;

    lastEvent.textContent = event
      ? `Last selected: ${event.name ?? event.eventCode}`
      : "";
  }

  private setFeedback(message: string, state: "idle" | "error" | "empty"): void {
    const feedback = getElement<HTMLElement>("home-event-feedback");
    if (!feedback) return;

    feedback.dataset.state = state;
    feedback.classList.toggle("hidden", !message);

    if (state === "error" && message) {
      feedback.innerHTML = `
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>${this.escape(message)}</span>
          <button id="home-retry-events-btn" type="button" class="inline-flex min-h-11 items-center justify-center rounded-[6px] border border-[#555] px-4 py-2 text-sm font-semibold text-[#f2f2f2] hover:border-[#777]">Try again</button>
        </div>
      `;
      getElement<HTMLButtonElement>("home-retry-events-btn")?.addEventListener(
        "click",
        () => this.loadEvents(),
      );
      return;
    }

    feedback.textContent = message;
  }

  private setResultsCount(message: string): void {
    const count = getElement<HTMLElement>("home-event-results-count");
    if (count) {
      count.textContent = message;
    }
  }

  private setRefreshButtonLoading(loading: boolean): void {
    const button = getElement<HTMLButtonElement>("home-refresh-events-btn");
    if (!button) return;

    button.disabled = loading;
    button.innerHTML = loading
      ? '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Loading'
      : '<i class="fas fa-rotate-right" aria-hidden="true"></i> Load';
  }

  private formatLocation(event: FIRSTEvent): string {
    const region = [event.city, event.stateprov].filter(Boolean).join(", ");
    return [region, event.country].filter(Boolean).join(", ") || "Location TBD";
  }

  private formatDateRange(event: FIRSTEvent): string {
    const startDate = this.formatDate(event.dateStart);
    const endDate = this.formatDate(event.dateEnd);

    if (!startDate && !endDate) {
      return "Date TBD";
    }

    if (startDate && endDate && startDate !== endDate) {
      return `${startDate} - ${endDate}`;
    }

    return startDate || endDate || "Date TBD";
  }

  private formatDate(value?: string | null): string {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
  }

  private isPastEvent(event: FIRSTEvent): boolean {
    if (!event.dateEnd) {
      return false;
    }

    const endDate = new Date(event.dateEnd);
    if (Number.isNaN(endDate.getTime())) {
      return false;
    }

    endDate.setUTCHours(23, 59, 59, 999);
    return endDate.getTime() < Date.now();
  }

  private escape(value: unknown): string {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  private hideModuleScreens(): void {
    const hasEvent = !!loadSelectedFIRSTEvent();
    const searchSection = getElement<HTMLElement>("home-event-search")?.closest("section");
    const listSection = getElement<HTMLElement>("home-event-list");
    const dashboardSection = getElement<HTMLElement>("home-dashboard");
    const changeEventBtn = getElement<HTMLElement>("home-change-event-btn");
    const resultsCount = getElement<HTMLElement>("home-event-results-count");

    if (dashboardSection) {
      dashboardSection.classList.toggle("hidden", !hasEvent);
    }
    if (searchSection) {
      searchSection.classList.toggle("hidden", hasEvent);
    }
    if (listSection) {
      listSection.classList.toggle("hidden", hasEvent);
    }
    if (resultsCount) {
      resultsCount.classList.toggle("hidden", hasEvent);
    }
    if (changeEventBtn) {
      changeEventBtn.classList.toggle("hidden", !hasEvent);
    }

    for (const id of moduleScreenIds) {
      const screen = getElement<HTMLElement>(id);
      screen?.classList.add("hidden");
      if (
        id === "home-screen" ||
        id === "match-scout-screen" ||
        id === "robot-scout-screen" ||
        id === "teams-screen" ||
        id === "team-detail-screen"
      ) {
        screen?.setAttribute("aria-hidden", "true");
      }
    }
  }

  private updateConnectionStatus(): void {
    const status = getElement<HTMLElement>("home-connection-status");
    if (!status) return;

    const online = navigator.onLine;
    status.textContent = online ? "Online" : "Offline";
    status.dataset.state = online ? "online" : "offline";
  }
}
