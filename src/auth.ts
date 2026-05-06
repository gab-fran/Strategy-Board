import { get, set } from "idb-keyval";
import type { UserProfile } from "./models/userModels.ts";

const USER_PROFILE_KEY = "strategy-board:user-profile";
const LEGACY_TEAM_NUMBER_KEY = "user-team-number";

export async function saveProfile(profile: UserProfile): Promise<void> {
  await set(USER_PROFILE_KEY, profile);

  try {
    localStorage.setItem(LEGACY_TEAM_NUMBER_KEY, profile.teamNumber);
  } catch (error) {
    console.warn("Could not sync team number to localStorage:", error);
  }
}

export async function loadProfile(): Promise<UserProfile | undefined> {
  const profile = await get<UserProfile>(USER_PROFILE_KEY);

  if (!profile || typeof profile !== "object") {
    return undefined;
  }

  return profile;
}

export async function hasProfile(): Promise<boolean> {
  return Boolean(await loadProfile());
}
