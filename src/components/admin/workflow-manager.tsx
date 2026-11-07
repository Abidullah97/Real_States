"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useConfirm } from "@/components/ui/confirm-dialog";
import EmptyState from "@/components/ui/empty-state";
import { submitJson } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import StatusBadge from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { formatAmount, formatDate, formatRelative } from "@/lib/format";

type Submission = { id: string; createdAt: Date | string; status: string; payload: unknown; submitter: { name: string | null; email: string } | null };

export function SubmissionQueue({ items }: { items: Submission[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const notify = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function review(s: Submission, title: string, action: "approve" | "reject") {
    const ok =
      action === "approve"
        ? await confirm({ title: `Approve and publish “${title}”?`, description: "A listing will be created from this submission and published on the public site immediately.", confirmLabel: "Approve and publish" })
        : await confirm({ title: `Reject “${title}”?`, description: "The submission will be marked as rejected and any uploaded photos will be deleted.", confirmLabel: "Reject submission", tone: "danger" });
    if (!ok) return;
    setBusyId(s.id);
    try {
      const j = await submitJson(`/api/admin/submissions/${s.id}`, "PATCH", { action });
      notify(j.message);
      router.refresh();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Review failed.", "error");
    } finally {
      setBusyId(null);
    }
  }

  if (!items.length) return <EmptyState icon="check-circle" title="You’re all caught up" description="New owner submissions will appear here for review." />;

  return (
    <div className="review-list">
      {items.map((s) => {
        const p = (s.payload || {}) as Record<string, unknown>;
        const title = `${String(p.propertyType || "Property")} in ${String(p.city || "unknown area")}`;
        const images = Array.isArray(p.images) ? (p.images as { url?: unknown; alt?: unknown }[]).filter((i) => typeof i.url === "string") : [];
        const listing = p.listingType === "RENT" ? "For rent" : "For sale";
        return (
          <article key={s.id} className="review-card">
            <div className="review-card-head">
              <div>
                <p className="table-sub">Submitted {formatRelative(s.createdAt)} · {formatDate(s.createdAt)}</p>
                <h2>{title}</h2>
                <p className="review-address">
                  <Icon name="pin" size={15} /> {String(p.address || "No address provided")}
                </p>
              </div>
              <StatusBadge status={s.status} />
            </div>
            <dl className="review-facts">
              <div>
                <dt>{listing === "For rent" ? "Monthly rent" : "Asking price"}</dt>
                <dd className="num">{formatAmount(Number(p.price || 0), String(p.currency || "PKR"))}</dd>
              </div>
              <div>
                <dt>Listing type</dt>
                <dd>{listing}</dd>
              </div>
              <div>
                <dt>Area</dt>
                <dd className="num">
                  {Number(p.area || 0).toLocaleString("en-US")} {String(p.areaUnit || "")}
                </dd>
              </div>
              <div>
                <dt>Bedrooms</dt>
                <dd className="num">{String(p.bedrooms ?? "—")}</dd>
              </div>
            </dl>
            {images.length > 0 && (
              <ul className="review-photos" aria-label="Submitted photos">
                {images.map((image, index) => (
                  <li key={index}>
                    <a href={String(image.url)} target="_blank" rel="noreferrer" aria-label={`Open submitted photo ${index + 1}`}>
                      <Image src={String(image.url)} alt="" fill sizes="140px" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <details className="review-details">
              <summary>Description and contact details</summary>
              <p className="prose">{String(p.description || "No description provided.")}</p>
              <p className="review-contact">
                <span>
                  <Icon name="user" size={15} /> {s.submitter?.name || String(p.name || "Visitor")}
                </span>
                <a href={`mailto:${s.submitter?.email || String(p.email || "")}`}>
                  <Icon name="mail" size={15} /> {s.submitter?.email || String(p.email || "")}
                </a>
                {typeof p.phone === "string" && p.phone && (
                  <a href={`tel:${p.phone}`}>
                    <Icon name="phone" size={15} /> {p.phone}
                  </a>
                )}
              </p>
            </details>
            {s.status === "PENDING" && (
              <div className="review-actions">
                <button type="button" className="btn btn-danger-ghost" disabled={busyId === s.id} onClick={() => review(s, title, "reject")}>
                  Reject
                </button>
                <button type="button" className="btn" disabled={busyId === s.id} onClick={() => review(s, title, "approve")}>
                  {busyId === s.id ? <span className="spinner" aria-hidden="true" /> : <Icon name="check" size={17} />} Approve and publish
                </button>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
