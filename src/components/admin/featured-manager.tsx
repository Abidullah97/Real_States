"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { DataTable, Panel } from "@/components/dashboard/dashboard-ui";
import { useConfirm } from "@/components/ui/confirm-dialog";
import EmptyState from "@/components/ui/empty-state";
import { submitJson } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import StatusBadge from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";

export type FeaturedRow = { id: string; title: string; reference: string; city: string; image: string | null; featuredOrder: number; featuredUntil: string | null; expired: boolean };

export default function FeaturedManager({ items, candidates, limit }: { items: FeaturedRow[]; candidates: { id: string; label: string }[]; limit: number }) {
  const router = useRouter();
  const confirm = useConfirm();
  const notify = useToast();
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<{ message?: string }>, success?: string) {
    setBusy(true);
    try {
      const j = await fn();
      notify(success || j.message || "Saved.");
      router.refresh();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Update failed.", "error");
    } finally {
      setBusy(false);
    }
  }

  const patch = (id: string, body: object) => submitJson(`/api/admin/properties/${id}`, "PATCH", body);

  /** Swaps with the neighbour and renumbers everything 1..n so the order is always explicit. */
  function move(index: number, dir: -1 | 1) {
    const next = [...items];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    run(async () => {
      await Promise.all(next.map((row, i) => (row.featuredOrder !== i + 1 ? patch(row.id, { featuredOrder: i + 1 }) : null)));
      return {};
    }, "Featured order saved.");
  }

  async function remove(row: FeaturedRow) {
    if (await confirm({ title: `Remove “${row.title}” from featured?`, description: "It stays published; it just won’t be highlighted.", confirmLabel: "Remove" })) run(() => patch(row.id, { featured: false }));
  }

  function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const id = String(d.get("propertyId") || "");
    if (!id) return;
    const until = String(d.get("until") || "");
    run(() => patch(id, { featured: true, featuredOrder: items.length + 1, featuredUntil: until || null }));
    e.currentTarget.reset();
  }

  function saveLimit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    run(() => submitJson("/api/admin/settings", "PATCH", { featuredLimit: Number(new FormData(e.currentTarget).get("featuredLimit")) }), "Homepage featured limit saved.");
  }

  const active = items.filter((i) => !i.expired).length;
  return (
    <div className="dash-stack featured-page">
      <div className="dash-grid dash-grid-even">
        <Panel title="Feature a listing">
          <form className="inline-form" onSubmit={add}>
            <label className="field">
              <span className="field-label">Published listing</span>
              <select name="propertyId" className="select" required defaultValue="">
                <option value="" disabled>
                  {candidates.length ? "Choose a listing…" : "No other published listings"}
                </option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">
                Featured until <span className="field-optional">(optional)</span>
              </span>
              <input name="until" type="date" className="input" min={new Date().toISOString().slice(0, 10)} />
            </label>
            <button type="submit" className="btn" disabled={busy || !candidates.length}>
              <Icon name="star" size={16} /> Feature
            </button>
          </form>
        </Panel>
        <Panel title="Homepage display">
          <form className="inline-form" onSubmit={saveLimit}>
            <label className="field">
              <span className="field-label">Featured listings shown on the homepage</span>
              <input name="featuredLimit" type="number" min={3} max={12} defaultValue={limit} className="input" required />
            </label>
            <button type="submit" className="btn btn-secondary" disabled={busy}>
              Save limit
            </button>
          </form>
          <p className="form-note">
            {active} active featured listing{active === 1 ? "" : "s"}. {active > limit ? `Only the first ${limit} by order appear on the homepage.` : "All are shown on the homepage."} Expired listings are hidden automatically.
          </p>
        </Panel>
      </div>

      <Panel title={`Featured listings (${items.length})`}>
        <DataTable
          caption="Featured listings in display order"
          rows={items}
          rowKey={(r) => r.id}
          empty={<EmptyState icon="star" headingLevel={3} title="Nothing featured yet" description="Featured listings appear first on the homepage and in search results." />}
          columns={[
            { key: "order", header: "Order", className: "num", cell: (r) => <span className="order-chip">{items.indexOf(r) + 1}</span> },
            {
              key: "property",
              header: "Listing",
              cell: (r) => (
                <div className="table-property">
                  <span className="table-thumb">{r.image ? <Image src={r.image} alt="" fill sizes="56px" /> : <Icon name="image" size={18} />}</span>
                  <span>
                    <Link href={`/admin/properties/${r.id}`} className="table-title">
                      {r.title}
                    </Link>
                    <span className="table-sub">
                      {r.reference} · {r.city}
                    </span>
                  </span>
                </div>
              ),
            },
            {
              key: "until",
              header: "Featured until",
              cell: (r) => (
                <input
                  type="date"
                  className="input input-compact"
                  aria-label={`Featured until for ${r.title}`}
                  defaultValue={r.featuredUntil ? r.featuredUntil.slice(0, 10) : ""}
                  onChange={(e) => run(() => patch(r.id, { featuredUntil: e.target.value || null }), "Expiry date saved.")}
                />
              ),
            },
            { key: "state", header: "State", cell: (r) => <StatusBadge status={r.expired ? "EXPIRED" : "FEATURED"} label={r.expired ? "Expired" : "Active"} /> },
            {
              key: "actions",
              header: "Actions",
              className: "table-actions",
              cell: (r) => {
                const i = items.indexOf(r);
                return (
                  <span className="inline-actions">
                    <button type="button" className="icon-btn" disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label={`Move ${r.title} up`}>
                      <Icon name="chevron-left" size={18} className="rotate-90" />
                    </button>
                    <button type="button" className="icon-btn" disabled={busy || i === items.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${r.title} down`}>
                      <Icon name="chevron-right" size={18} className="rotate-90" />
                    </button>
                    <button type="button" className="btn btn-danger-ghost btn-sm" disabled={busy} onClick={() => remove(r)}>
                      Remove
                    </button>
                  </span>
                );
              },
            },
          ]}
        />
      </Panel>
    </div>
  );
}
