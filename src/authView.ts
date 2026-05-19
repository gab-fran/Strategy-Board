import { saveProfile } from "./auth.ts";
import type { UserProfile } from "./models/userModels.ts";

const getRequiredElement = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Missing identity screen element: #${id}`);
  }

  return element as T;
};

const setError = (message: string): void => {
  const error = document.getElementById("identity-error");

  if (!error) return;

  error.textContent = message;
  error.classList.toggle("hidden", !message);
};

export function showIdentityScreen(): void {
  const screen = getRequiredElement<HTMLElement>("identity-screen");
  screen.classList.remove("hidden");
  screen.setAttribute("aria-hidden", "false");

  requestAnimationFrame(() => {
    document.getElementById("identity-team-number")?.focus();
  });
}

export function hideIdentityScreen(): void {
  const screen = getRequiredElement<HTMLElement>("identity-screen");
  screen.classList.add("hidden");
  screen.setAttribute("aria-hidden", "true");
  setError("");
}

export function readIdentityForm(): UserProfile | undefined {
  const teamNumber = getRequiredElement<HTMLInputElement>(
    "identity-team-number",
  ).value.trim();
  const userName = getRequiredElement<HTMLInputElement>(
    "identity-user-name",
  ).value.trim();
  const role = getRequiredElement<HTMLSelectElement>("identity-role").value;

  if (!/^\d{1,5}$/.test(teamNumber) || teamNumber === "0") {
    setError("Enter a valid team number.");
    return undefined;
  }

  if (!userName) {
    setError("Enter your name.");
    return undefined;
  }

  if (!role) {
    setError("Choose your role.");
    return undefined;
  }

  setError("");
  return { teamNumber, userName, role };
}

export function promptForIdentity(): Promise<UserProfile> {
  showIdentityScreen();

  return new Promise((resolve) => {
    const form = getRequiredElement<HTMLFormElement>("identity-form");
    const submit = async (event: SubmitEvent): Promise<void> => {
      event.preventDefault();

      const profile = readIdentityForm();

      if (!profile) {
        return;
      }

      try {
        await saveProfile(profile);
        hideIdentityScreen();
        form.removeEventListener("submit", submit);
        resolve(profile);
      } catch (error) {
        console.error("Failed to save user profile:", error);
        setError("Could not save your profile. Try again.");
      }
    };

    form.addEventListener("submit", submit);
  });
}
