import { NextResponse } from "next/server";
import { logAction } from "@/lib/audit";
import { uploadCloudinaryImage } from "@/lib/cloudinary";
import { requireAdmin } from "@/lib/permissions";
import { overLimit } from "@/lib/rate-limit";
import { validateImageFile } from "@/lib/uploads";

const KINDS = ["logo", "favicon", "hero", "og"] as const;

/** Uploads a branding image (logo, favicon, hero or social sharing image) and returns its URL for the settings form. */
export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;
  try {
    if (await overLimit(`settings-upload:${gate.principal!.id}`, 30, 60 * 60_000)) return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });
    const form = await request.formData();
    const kind = String(form.get("kind")) as (typeof KINDS)[number];
    if (!KINDS.includes(kind)) return NextResponse.json({ error: "Unknown image type." }, { status: 400 });
    const file = form.get("file");
    const invalid = await validateImageFile(file, kind === "favicon" ? 1024 * 1024 : 8 * 1024 * 1024);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
    const asset = await uploadCloudinaryImage(file as File, `estate-house/site/${kind}`);
    await logAction(gate.principal!.id, "settings.upload", "SiteSettings", kind);
    return NextResponse.json({ message: "Image uploaded. Save settings to apply it.", url: asset.url });
  } catch {
    return NextResponse.json({ error: "Image could not be uploaded." }, { status: 503 });
  }
}
