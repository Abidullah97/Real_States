import { NextResponse } from "next/server";
import { logAction } from "@/lib/audit";
import { uploadCloudinaryImage } from "@/lib/cloudinary";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { overLimit } from "@/lib/rate-limit";
import { validateImageFile } from "@/lib/uploads";

const AVATAR_BYTES = 5 * 1024 * 1024;

/** Uploads a profile picture (agents and staff) to the configured image storage. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;
  try {
    if (await overLimit(`avatar:${gate.principal!.id}`, 30, 60 * 60_000)) return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });
    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });
    const file = (await request.formData()).get("file");
    const invalid = await validateImageFile(file, AVATAR_BYTES);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
    const asset = await uploadCloudinaryImage(file as File, "estate-house/avatars");
    await prisma.user.update({ where: { id }, data: { image: asset.url } });
    await logAction(gate.principal!.id, "user.avatar_upload", "User", id);
    return NextResponse.json({ message: "Profile picture updated.", url: asset.url });
  } catch {
    return NextResponse.json({ error: "Profile picture could not be uploaded." }, { status: 503 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;
  try {
    const { id } = await params;
    await prisma.user.update({ where: { id }, data: { image: null } });
    await logAction(gate.principal!.id, "user.avatar_remove", "User", id);
    return NextResponse.json({ message: "Profile picture removed." });
  } catch {
    return NextResponse.json({ error: "Profile picture could not be removed." }, { status: 503 });
  }
}
