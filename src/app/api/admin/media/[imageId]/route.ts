import { NextResponse } from "next/server";
import { logAction } from "@/lib/audit";
import { destroyCloudinaryImage } from "@/lib/cloudinary";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

/**
 * Media library delete. Images on archived or rejected listings can be cleaned up freely; an image that is
 * the only photo of a published listing is protected until a replacement is uploaded.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ imageId: string }> }) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;
  try {
    const { imageId } = await params;
    const image = await prisma.propertyImage.findUnique({ where: { id: imageId }, include: { property: { select: { id: true, status: true, _count: { select: { images: true } } } } } });
    if (!image) return NextResponse.json({ error: "Image not found." }, { status: 404 });
    if (image.property.status === "PUBLISHED" && image.property._count.images <= 1) {
      return NextResponse.json({ error: "This is the only photo of a published listing. Upload a replacement first." }, { status: 409 });
    }
    if (image.publicId) await destroyCloudinaryImage(image.publicId).catch(() => {});
    await prisma.$transaction(async (tx) => {
      await tx.propertyImage.delete({ where: { id: imageId } });
      const rest = await tx.propertyImage.findMany({ where: { propertyId: image.propertyId }, orderBy: { position: "asc" }, select: { id: true } });
      for (const [position, row] of rest.entries()) await tx.propertyImage.update({ where: { id: row.id }, data: { position } });
    });
    await logAction(gate.principal!.id, "media.delete", "PropertyImage", imageId, { propertyId: image.propertyId });
    return NextResponse.json({ message: "Image deleted." });
  } catch {
    return NextResponse.json({ error: "Image could not be deleted." }, { status: 503 });
  }
}
