export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Detects the real image type from file signature bytes rather than trusting the name or MIME header. */
function sniffImageType(bytes: Uint8Array) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

/** Returns an error message for an unacceptable upload, or null when the file is a valid image. */
export async function validateImageFile(file: unknown, maxBytes = MAX_IMAGE_BYTES): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return "Choose an image to upload.";
  if (file.size > maxBytes) return `Images must be smaller than ${Math.round(maxBytes / 1024 / 1024)} MB.`;
  const type = sniffImageType(new Uint8Array(await file.slice(0, 16).arrayBuffer()));
  if (!type) return "Only JPEG, PNG and WebP images are supported.";
  return null;
}
