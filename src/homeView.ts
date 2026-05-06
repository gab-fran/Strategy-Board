type HomeViewOptions = {
  activeEventKey?: string;
  strategyBoardElementId?: string;
};

const moduleScreenIds = [
  "home-screen",
  "home-container",
  "match-scout-screen",
  "pit-scout-screen",
  "teams-screen",
  "team-detail-screen",
  "whiteboard-container",
];

const getElement = <T extends HTMLElement>(id: string): T | null =>
  document.getElementById(id) as T | null;

export class HomeView {
  private homeScreen: HTMLElement;
  private strategyBoardElementId: string;

  constructor(options: HomeViewOptions = {}) {
    const homeScreen = getElement<HTMLElement>("home-screen");

    if (!homeScreen) {
      throw new Error("Missing home screen element: #home-screen");
    }

    this.homeScreen = homeScreen;
    this.strategyBoardElementId =
      options.strategyBoardElementId ?? "home-container";

    this.setActiveEvent(options.activeEventKey);
    this.updateConnectionStatus();
    this.bindEvents();
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

    badge.textContent = eventKey?.trim() ? eventKey : "No active event";
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
    getElement<HTMLButtonElement>("home-open-pit-scout-btn")?.addEventListener(
      "click",
      () => this.openModuleScreen("pit-scout-screen", "pit-scout"),
    );
    getElement<HTMLButtonElement>("home-open-teams-btn")?.addEventListener(
      "click",
      () => this.openModuleScreen("teams-screen", "teams"),
    );

    window.addEventListener("online", () => this.updateConnectionStatus());
    window.addEventListener("offline", () => this.updateConnectionStatus());
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

  private hideModuleScreens(): void {
    for (const id of moduleScreenIds) {
      const screen = getElement<HTMLElement>(id);
      screen?.classList.add("hidden");
      if (
        id === "home-screen" ||
        id === "match-scout-screen" ||
        id === "pit-scout-screen" ||
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
