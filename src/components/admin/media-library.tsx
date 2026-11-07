"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useConfirm } from "@/components/ui/confirm-dialog";
import EmptyState from "@/components/ui/empty-state";
import { FormAlert, SubmitButton, type FormMessage } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import StatusBadge from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";

export type MediaItem = {
  id: string;
  url: string;
  alt: string;
  position: number;
  publicId: string | null;
  propertyId: string;
  propertyTitle: string;
  propertyStatus: string;
  protectedImage: boolean;
};

const MAX_BYTES = 10 * 1024 * 1024;

/** Cloudinary transformation URLs reveal format; delivery info is read from the URL itself. */
function describe(item: MediaItem) {
  const host = (() => {
    try {
      return new URL(item.url).hostname;
    } catch {
      return "unknown";
    }
  })();
  const ext = item.url.split("?")[0].split(".").pop()?.toLowerCase();
  return { storage: item.publicId?.startsWith("local:") ? "Local storage" : item.publicId ? "Cloudinary" : host.includes("unsplash") ? "External (Unsplash)" : host, format: ext && ext.length <= 4 ? ext.toUpperCase() : "Auto" };
}

export default function MediaLibrary({ items, properties }: { items: MediaItem[]; properties: { id: string; label: string }[] }) {
  const router = useRouter();
  const notify = useToast();
  const confirm = useConfirm();
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [message, setMessage] = useState<FormMessage>(null);
  const [busy, setBusy] = useState(false);

  async function remove(item: MediaItem) {
    if (!(await confirm({ title: "Delete this image?", description: `It will be removed from “${item.propertyTitle}” and deleted from storage.`, confirmLabel: "Delete image", tone: "danger" }))) return;
    try {
      const r = await fetch(`/api/admin/media/${item.id}`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      notify(j.message);
      setSelected(null);
      router.refresh();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Delete failed.", "error");
    }
  }

  async function upload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const propertyId = String(data.get("propertyId") || "");
    const files = data.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    if (!propertyId || !files.length) return setMessage({ tone: "error", text: "Choose a listing and at least one image." });
    const tooBig = files.find((f) => f.size > MAX_BYTES || !["image/jpeg", "image/png", "image/webp"].includes(f.type));
    if (tooBig) return setMessage({ tone: "error", text: `${tooBig.name}: only JPEG, PNG or WebP images up to 10 MB.` });
    setBusy(true);
    setMessage(null);
    try {
      for (const file of files) {
        const body = new FormData();
        body.set("file", file);
        body.set("alt", String(data.get("alt") || file.name.replace(/\.[^.]+$/, "")).slice(0, 100));
        const r = await fetch(`/api/properties/${propertyId}/images`, { method: "POST", body });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Upload failed.");
      }
      setMessage({ tone: "success", text: `${files.length} image${files.length === 1 ? "" : "s"} uploaded.` });
      form.reset();
      router.refresh();
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Upload failed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="media-layout">
      <div>
        {items.length ? (
          <ul className="media-grid">
            {items.map((m) => (
              <li key={m.id}>
                <button type="button" className={`media-tile ${selected?.id === m.id ? "is-selected" : ""}`} onClick={() => setSelected(m)} aria-label={`Image details: ${m.alt}`}>
                  <Image src={m.url} alt="" fill sizes="200px" />
                  {m.position === 0 && <span className="badge badge-overlay">Cover</span>}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon="images" title="No images match" description="Try a different filter, or upload images to a listing." />
        )}
      </div>
      <aside className="media-side">
        {selected ? (
          <div className="panel panel-body media-info">
            <div className="media-preview">
              <Image src={selected.url} alt={selected.alt} fill sizes="320px" />
            </div>
            <dl className="kv">
              <div>
                <dt>Description</dt>
                <dd>{selected.alt}</dd>
              </div>
              <div>
                <dt>Listing</dt>
                <dd>
                  <Link href={`/admin/properties/${selected.propertyId}`}>{selected.propertyTitle}</Link>
                </dd>
              </div>
              <div>
                <dt>Listing status</dt>
                <dd>
                  <StatusBadge status={selected.propertyStatus} />
                </dd>
              </div>
              <div>
                <dt>Position</dt>
                <dd>{selected.position === 0 ? "Cover image" : `#${selected.position + 1}`}</dd>
              </div>
              <div>
                <dt>Storage</dt>
                <dd>{describe(selected).storage}</dd>
              </div>
              <div>
                <dt>Format</dt>
                <dd>{describe(selected).format}</dd>
              </div>
            </dl>
            <div className="form-actions">
              <a href={selected.url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                <Icon name="external" size={15} /> Open original
              </a>
              {selected.protectedImage ? (
                <p className="form-note">Protected: this is the only photo of a published listing. Upload a replacement before deleting it.</p>
              ) : (
                <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => remove(selected)}>
                  <Icon name="trash" size={15} /> Delete
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="panel panel-body">
            <p className="panel-empty">Select an image to see its details.</p>
          </div>
        )}
        <form className="panel panel-body form media-upload" onSubmit={upload}>
          <h2 className="form-section-title">Upload property images</h2>
          <label className="field">
            <span className="field-label">Listing</span>
            <select name="propertyId" className="select" required defaultValue="">
              <option value="" disabled>
                Choose a listing…
              </option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Description</span>
            <input name="alt" className="input" maxLength={100} placeholder="e.g. Front exterior" />
          </label>
          <label className="field">
            <span className="field-label">Images</span>
            <input name="files" type="file" className="input" accept="image/jpeg,image/png,image/webp" multiple required />
            <span className="field-hint">JPEG, PNG or WebP · up to 10 MB each · max 20 per listing. Files are checked by content on the server.</span>
          </label>
          <FormAlert message={message} />
          <SubmitButton busy={busy} busyLabel="Uploading…">
            <Icon name="upload" size={16} /> Upload
          </SubmitButton>
        </form>
      </aside>
    </div>
  );
}
