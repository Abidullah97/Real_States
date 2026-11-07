"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Field, FormAlert, SubmitButton, type FormMessage } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";

type Picture = { id: string; url: string; alt: string; position: number };
const MAX_IMAGES = 20;

export default function PropertyImageManager({ propertyId, images }: { propertyId: string; images: Picture[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<FormMessage>(null);

  async function upload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fields = new FormData(form);
    const files = fields.getAll("files").filter((x): x is File => x instanceof File && x.size > 0);
    const alt = String(fields.get("alt") || "");
    if (!files.length) {
      setMessage({ tone: "error", text: "Choose at least one image." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      for (const file of files) {
        const data = new FormData();
        data.set("file", file);
        data.set("alt", `${alt || "Property photo"} — ${file.name.replace(/\.[^.]+$/, "").slice(0, 80)}`);
        const r = await fetch(`/api/properties/${propertyId}/images`, { method: "POST", body: data });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Upload failed.");
      }
      setMessage({ tone: "success", text: `${files.length} image${files.length === 1 ? "" : "s"} uploaded.` });
      form.reset();
      router.refresh();
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Image upload failed." });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function reorder(index: number, direction: -1 | 1) {
    const next = [...images];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setBusy(true);
    try {
      const r = await fetch(`/api/properties/${propertyId}/images`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ imageIds: next.map((x) => x.id) }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setMessage({ tone: "success", text: "Photo order saved." });
      router.refresh();
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Could not reorder images." });
    } finally {
      setBusy(false);
    }
  }

  async function remove(image: Picture) {
    const ok = await confirm({ title: "Remove this photo?", description: `“${image.alt}” will be removed from the listing and deleted from storage.`, confirmLabel: "Remove photo", tone: "danger" });
    if (!ok) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/properties/${propertyId}/images/${image.id}`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setMessage({ tone: "success", text: j.message });
      router.refresh();
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Could not remove image." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="image-manager" aria-labelledby={`photos-${propertyId}`}>
      <div className="image-manager-head">
        <h3 id={`photos-${propertyId}`} className="form-section-title">
          Photos
        </h3>
        <span className="table-sub num">
          {images.length} / {MAX_IMAGES}
        </span>
      </div>
      {images.length > 0 ? (
        <ul className="image-grid">
          {images.map((image, index) => (
            <li key={image.id}>
              <div className="image-grid-thumb">
                <Image src={image.url} alt={image.alt} fill sizes="180px" />
                {index === 0 && <span className="badge badge-overlay">Cover</span>}
              </div>
              <div className="image-grid-actions">
                <button type="button" className="icon-btn" disabled={busy || index === 0} onClick={() => reorder(index, -1)} aria-label={`Move photo ${index + 1} earlier`}>
                  <Icon name="chevron-left" size={18} />
                </button>
                <button type="button" className="icon-btn" disabled={busy || index === images.length - 1} onClick={() => reorder(index, 1)} aria-label={`Move photo ${index + 1} later`}>
                  <Icon name="chevron-right" size={18} />
                </button>
                <button type="button" className="icon-btn image-remove" disabled={busy} onClick={() => remove(image)} aria-label={`Remove photo ${index + 1}`}>
                  <Icon name="trash" size={17} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="panel-empty">No photos yet. The first photo you upload becomes the cover image.</p>
      )}
      {images.length < MAX_IMAGES && (
        <form className="image-upload" onSubmit={upload}>
          <Field label="Photo description" hint="Used as alternative text, e.g. “Front exterior”.">
            <input className="input" name="alt" required minLength={3} maxLength={100} />
          </Field>
          <Field label="Images" hint={`JPEG, PNG or WebP · up to 10 MB each · ${MAX_IMAGES - images.length} remaining.`}>
            <input className="input" name="files" type="file" accept="image/jpeg,image/png,image/webp" multiple required />
          </Field>
          <SubmitButton busy={busy} busyLabel="Uploading…" className="btn-secondary">
            <Icon name="upload" size={17} /> Upload photos
          </SubmitButton>
        </form>
      )}
      <FormAlert message={message} />
    </section>
  );
}
