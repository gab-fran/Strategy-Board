export type UserRole = "scout" | "strategy" | "strategist" | "admin" | string;

export type PermissionAction =
  | "create-scout"
  | "view-teams"
  | "view-strategy-board"
  | "edit"
  | "delete"
  | "sync"
  | "admin";

const normalizeRole = (role: string | undefined): string =>
  String(role ?? "")
    .trim()
    .toLowerCase();

export function can(action: PermissionAction, role: UserRole | undefined): boolean {
  const normalizedRole = normalizeRole(role);
  const hasRole = normalizedRole.length > 0;

  if (normalizedRole === "admin" || normalizedRole === "coach") {
    return true;
  }

  if (action === "view-teams" || action === "view-strategy-board") {
    return hasRole;
  }

  if (normalizedRole === "scout" || normalizedRole === "drive-team") {
    return action === "create-scout" || action === "sync";
  }

  if (normalizedRole === "strategy" || normalizedRole === "strategist") {
    return action === "sync";
  }

  return false;
}
