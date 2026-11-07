import { readFile } from "node:fs/promises";
import { resolveLocalUpload } from "@/lib/cloudinary";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** Serves images saved to the local `uploads/` folder when Cloudinary is not configured. */
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const relative = path.join("/");
  const type = TYPES[relative.split(".").pop()?.toLowerCase() || ""];
  const full = type ? resolveLocalUpload(relative) : null;
  if (!full) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(full);
    return new Response(new Uint8Array(data), {
      headers: { "Content-Type": type!, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
