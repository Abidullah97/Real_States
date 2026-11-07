/** Pure role helpers, safe to import from client components. */
export type Role = "USER" | "OWNER" | "AGENT" | "ADMIN" | "SUPER_ADMIN";

export const ADMIN_ROLES: Role[] = ["ADMIN", "SUPER_ADMIN"];
export const ALL_ROLES: Role[] = ["USER", "OWNER", "AGENT", "ADMIN", "SUPER_ADMIN"];

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  AGENT: "Agent",
  OWNER: "Property Owner",
  USER: "Regular User",
};

export const isAdminRole = (role: string | null | undefined): boolean => role === "ADMIN" || role === "SUPER_ADMIN";

/** Roles an actor may grant. Only a Super Admin can create or manage administrators. */
export function assignableRoles(actor: string): Role[] {
  return actor === "SUPER_ADMIN" ? ALL_ROLES : ["USER", "OWNER", "AGENT"];
}
