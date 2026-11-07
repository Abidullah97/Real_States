import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

/** The signed-in administrator's latest notifications and unread count. */
export async function GET() {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;
  try {
    const userId = gate.principal!.id;
    const [items, unread] = await Promise.all([
      prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 8 }),
      prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    return NextResponse.json({ items, unread }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Notifications could not be loaded." }, { status: 503 });
  }
}

const markSchema = z.union([z.object({ all: z.literal(true) }), z.object({ ids: z.array(z.string().max(60)).min(1).max(200) })]);

/** Marks notifications as read. Only the recipient's own notifications are affected. */
export async function PATCH(request: Request) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;
  try {
    const parsed = markSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    const userId = gate.principal!.id;
    const where = "all" in parsed.data ? { userId, readAt: null } : { userId, id: { in: parsed.data.ids }, readAt: null };
    const result = await prisma.notification.updateMany({ where, data: { readAt: new Date() } });
    return NextResponse.json({ message: result.count ? `${result.count} marked as read.` : "Nothing to mark.", count: result.count });
  } catch {
    return NextResponse.json({ error: "Notifications could not be updated." }, { status: 503 });
  }
}
