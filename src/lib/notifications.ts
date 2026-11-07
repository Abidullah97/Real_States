import { prisma } from "@/lib/prisma";

export type NotificationType = "submission" | "registration" | "agent_application" | "inquiry" | "approval_request" | "system";

/**
 * Creates one notification per active administrator for a real backend event.
 * Failures are swallowed so a notification problem never blocks the user's action.
 */
export async function notifyAdmins(type: NotificationType, title: string, body?: string, href?: string) {
  try {
    const admins = await prisma.user.findMany({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, disabledAt: null }, select: { id: true } });
    if (!admins.length) return;
    await prisma.notification.createMany({ data: admins.map((a) => ({ userId: a.id, type, title, body: body?.slice(0, 300), href })) });
  } catch {}
}
