import { NextResponse } from "next/server";
import { logAction } from "@/lib/audit";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

/** Bulk-deletes every inquiry marked as spam. */
export async function DELETE(request: Request) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;
  const url = new URL(request.url);
  if (url.searchParams.get("status") !== "SPAM" || url.searchParams.get("confirm") !== "delete") {
    return NextResponse.json({ error: "Only spam can be bulk-deleted, with explicit confirmation." }, { status: 400 });
  }
  try {
    const result = await prisma.inquiry.deleteMany({ where: { status: "SPAM" } });
    await logAction(gate.principal!.id, "inquiry.delete_spam", "Inquiry", "SPAM", { count: result.count });
    return NextResponse.json({ message: `${result.count} spam inquir${result.count === 1 ? "y" : "ies"} deleted.` });
  } catch {
    return NextResponse.json({ error: "Spam could not be deleted." }, { status: 503 });
  }
}
