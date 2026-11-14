/**
 * Browser-side image shrinking before upload.
 *
 * Vercel rejects request bodies larger than 4.5 MB before the route handler runs, and phone photos are often
 * 3–10 MB. Large JPEG/PNG/WebP files are therefore resized (longest side ≤ maxDimension) and re-encoded until
 * they fit the byte budget. Photos stay JPEG; PNG/WebP become WebP so transparency survives (JPEG fallback
 * where the browser cannot encode WebP). Small files, unsupported types, or any failure return the original.
 */
export async function shrinkImage(file: File, {maxBytes = 1.5 * 1024 * 1024, maxDimension = 2400} = {}): Promise<File> {
  if (typeof window === "undefined" || !/^image\/(jpeg|png|webp)$/.test(file.type) || file.size <= maxBytes) return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, {imageOrientation: "from-image"});
  } catch {
    return file;
  }
  try {
    const types = file.type === "image/jpeg" ? ["image/jpeg"] : ["image/webp", "image/jpeg"];
    let dimension = maxDimension;
    // Try progressively smaller sizes/qualities until the result fits the budget.
    for (let round = 0; round < 4; round++, dimension = Math.round(dimension * 0.8)) {
      const scale = Math.min(1, dimension / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale)), height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      for (const type of types) {
        ctx.clearRect(0, 0, width, height);
        if (type === "image/jpeg") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
        }
        ctx.drawImage(bitmap, 0, 0, width, height);
        for (const quality of [0.86, 0.78, 0.7]) {
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
          if (!blob || blob.type !== type) break; // encoder not supported for this type; try the next type
          if (blob.size <= maxBytes) {
            const extension = type === "image/jpeg" ? "jpg" : "webp";
            return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "photo"}.${extension}`, {type, lastModified: Date.now()});
          }
        }
      }
    }
    return file;
  } finally {
    bitmap.close();
  }
}
