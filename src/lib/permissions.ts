import { redirect } from "next/navigation";
import { currentPrincipal, requireRoles, type Principal } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

import { ADMIN_ROLES, assignableRoles, isAdminRole, type Role } from "@/lib/roles";

export { ADMIN_ROLES, ALL_ROLES, ROLE_LABELS, assignableRoles, isAdminRole, type Role } from "@/lib/roles";

/** API guard for every administrative endpoint. */
export const requireAdmin = () => requireRoles(ADMIN_ROLES);

/** Page guard: redirects anonymous visitors to sign in and non-admins to their dashboard. */
export async function requireAdminPage(callbackUrl = "/admin"): Promise<Principal> {
  const principal = await currentPrincipal();
  if (!principal) redirect(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  if (!isAdminRole(principal.role)) redirect("/dashboard");
  return principal;
}

export type AccountChange = { role?: Role; suspend?: boolean; delete?: boolean };

/**
 * Server-side rules for changing another account. Returns an error message, or null when allowed.
 * - Nobody may suspend, delete or demote themselves.
 * - Only a Super Admin may change an administrator or grant administrator roles.
 * - The last active Super Admin can never be demoted, suspended or deleted.
 */
export async function checkAccountChange(actor: Principal, target: { id: string; role: Role; disabledAt: Date | null }, change: AccountChange): Promise<string | null> {
  const self = actor.id === target.id;
  if (self && (change.suspend || change.delete || (change.role && change.role !== actor.role))) return "You cannot suspend, delete or change the role of your own account.";
  if (isAdminRole(target.role) && actor.role !== "SUPER_ADMIN" && !self) return "Only a Super Admin can change administrator accounts.";
  if (change.role && !assignableRoles(actor.role).includes(change.role)) return "Only a Super Admin can grant administrator roles.";
  const losesSuperAdmin = target.role === "SUPER_ADMIN" && (change.delete || change.suspend || (change.role && change.role !== "SUPER_ADMIN"));
  if (losesSuperAdmin) {
    const others = await prisma.user.count({ where: { role: "SUPER_ADMIN", disabledAt: null, id: { not: target.id } } });
    if (others === 0) return "This is the last active Super Admin. Promote another Super Admin first.";
  }
  return null;
}
