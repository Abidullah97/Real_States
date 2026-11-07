import { NextResponse } from "next/server";
import { logAction } from "@/lib/audit";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { siteSettingsSchema } from "@/lib/validation";

export async function PATCH(request: Request) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;
  try {
    const parsed = siteSettingsSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message?.startsWith("Use an image") ? parsed.error.issues[0].message : "Check the settings: links must start with https:// and the email must be valid." }, { status: 400 });
    // Empty text clears a value so it disappears from the site; toggles and numbers are stored as given.
    const data = Object.fromEntries(Object.entries(parsed.data).map(([k, v]) => [k, v === "" ? null : v]));
    await prisma.siteSettings.upsert({ where: { id: "site" }, create: { id: "site", ...data }, update: data });
    await logAction(gate.principal!.id, "settings.update", "SiteSettings", "site", { fields: Object.keys(data) });
    return NextResponse.json({ message: "Site settings saved." });
  } catch {
    return NextResponse.json({ error: "Site settings could not be saved." }, { status: 503 });
  }
}
