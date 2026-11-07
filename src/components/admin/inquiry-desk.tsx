"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { DataTable } from "@/components/dashboard/dashboard-ui";
import Pagination from "@/components/property/pagination";
import { useConfirm } from "@/components/ui/confirm-dialog";
import EmptyState from "@/components/ui/empty-state";
import { Field, FormAlert, SubmitButton, submitJson, type FormMessage } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import SlideOver from "@/components/ui/slide-over";
import StatusBadge from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { formatDate, formatRelative } from "@/lib/format";

export type InquiryRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: string;
  internalNotes: string | null;
  createdAt: Date | string;
  assignedTo: { email: string; name: string | null } | null;
  property: { id: string; title: string; reference: string } | null;
};

const TABS = ["ALL", "NEW", "READ", "CONTACTED", "QUALIFIED", "CLOSED", "SPAM"];
const LABEL: Record<string, string> = { ALL: "All", NEW: "New", READ: "Read", CONTACTED: "Contacted", QUALIFIED: "Qualified", CLOSED: "Resolved", SPAM: "Spam" };

function InquiryEditor({ inquiry, agents, onSaved, onDeleted }: { inquiry: InquiryRow; agents: { email: string; name: string }[]; onSaved: (m: string) => void; onDeleted: (m: string) => void }) {
  const confirm = useConfirm();
  const [message, setMessage] = useState<FormMessage>(null);
  const [busy, setBusy] = useState(false);

  async function save(body: Record<string, unknown>) {
    setBusy(true);
    setMessage(null);
    try {
      const j = await submitJson(`/api/admin/inquiries/${inquiry.id}`, "PATCH", body);
      onSaved(j.message);
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Update failed." });
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget).entries());
    save({ status: d.status, internalNotes: d.internalNotes, assignedToEmail: d.assignedToEmail || null });
  }

  async function remove() {
    if (!(await confirm({ title: `Delete the inquiry from ${inquiry.name}?`, description: "It will be permanently removed.", confirmLabel: "Delete inquiry", tone: "danger" }))) return;
    try {
      const r = await fetch(`/api/admin/inquiries/${inquiry.id}?confirm=delete`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      onDeleted(j.message);
    } catch (e) {
      setMessage({ tone: "error", text: e instanceof Error ? e.message : "Delete failed." });
    }
  }

  return (
    <div className="inquiry-editor">
      <dl className="kv">
        <div>
          <dt>Email</dt>
          <dd>
            <a href={`mailto:${inquiry.email}`}>{inquiry.email}</a>
          </dd>
        </div>
        <div>
          <dt>Phone</dt>
          <dd>{inquiry.phone ? <a href={`tel:${inquiry.phone}`}>{inquiry.phone}</a> : "Not provided"}</dd>
        </div>
        <div>
          <dt>Property</dt>
          <dd>{inquiry.property ? <Link href={`/admin/properties/${inquiry.property.id}`}>{inquiry.property.title}</Link> : "General inquiry"}</dd>
        </div>
        <div>
          <dt>Received</dt>
          <dd>{formatDate(inquiry.createdAt, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</dd>
        </div>
      </dl>
      <blockquote className="inquiry-message">
        <p>{inquiry.message}</p>
      </blockquote>
      <div className="inline-actions inquiry-quick">
        <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => save({ status: "CONTACTED" })}>
          <Icon name="phone" size={15} /> Mark contacted
        </button>
        <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => save({ status: "CLOSED" })}>
          <Icon name="check-circle" size={15} /> Mark resolved
        </button>
        <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => save({ status: "NEW" })}>
          Mark as new
        </button>
        <button type="button" className="btn btn-danger-ghost btn-sm" disabled={busy} onClick={() => save({ status: "SPAM" })}>
          <Icon name="ban" size={15} /> Spam
        </button>
      </div>
      <form className="form" onSubmit={submit}>
        <div className="form-grid">
          <Field label="Status">
            <select className="select" name="status" defaultValue={inquiry.status}>
              {TABS.slice(1).map((s) => (
                <option key={s} value={s}>
                  {LABEL[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Assigned agent" optional>
            <select className="select" name="assignedToEmail" defaultValue={inquiry.assignedTo?.email || ""}>
              <option value="">Unassigned</option>
              {agents.map((a) => (
                <option key={a.email} value={a.email}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Internal notes" optional className="span-full" hint="Visible only to administrators and the assigned agent.">
            <textarea className="textarea" name="internalNotes" maxLength={5000} rows={5} defaultValue={inquiry.internalNotes || ""} />
          </Field>
        </div>
        <FormAlert message={message} />
        <div className="form-actions">
          <SubmitButton busy={busy} busyLabel="Saving…">
            Save changes
          </SubmitButton>
          <button type="button" className="btn btn-danger-ghost" onClick={remove}>
            <Icon name="trash" size={16} /> Delete
          </button>
        </div>
      </form>
    </div>
  );
}

export default function InquiryDesk({ items, total, page, pageSize, status, counts, agents, filters, openId }: { items: InquiryRow[]; total: number; page: number; pageSize: number; status: string; counts: Record<string, number>; agents: { email: string; name: string }[]; filters: React.ReactNode; openId?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const notify = useToast();
  const confirm = useConfirm();
  const [selected, setSelected] = useState<string | null>(openId && items.some((i) => i.id === openId) ? openId : null);
  const open = items.find((i) => i.id === selected);
  const marked = useRef(new Set<string>());

  // Opening a new inquiry marks it as read, so the "new" count reflects what still needs attention.
  useEffect(() => {
    if (!open || open.status !== "NEW" || marked.current.has(open.id)) return;
    marked.current.add(open.id);
    fetch(`/api/admin/inquiries/${open.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "READ" }) }).then(() => router.refresh());
  }, [open, router]);

  const hrefWith = (patch: Record<string, string | null>) => {
    const q = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "ALL") q.delete(k);
      else q.set(k, v);
    }
    q.delete("open");
    return `${pathname}${q.toString() ? `?${q}` : ""}`;
  };

  async function purgeSpam() {
    if (!(await confirm({ title: `Delete all ${counts.SPAM} spam inquiries?`, description: "They will be permanently removed.", confirmLabel: "Delete spam", tone: "danger" }))) return;
    try {
      const r = await fetch("/api/admin/inquiries?status=SPAM&confirm=delete", { method: "DELETE" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      notify(j.message);
      router.refresh();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Delete failed.", "error");
    }
  }

  const closeAndRefresh = (m: string) => {
    notify(m);
    setSelected(null);
    router.refresh();
  };

  return (
    <>
      <nav className="status-tabs" aria-label="Filter by status">
        {TABS.map((s) => (
          <Link key={s} href={hrefWith({ status: s, page: null })} aria-current={status === s ? "page" : undefined}>
            {LABEL[s]} <span className="num">{counts[s] || 0}</span>
          </Link>
        ))}
      </nav>
      <div className="table-toolbar property-toolbar">
        {filters}
        {status === "SPAM" && counts.SPAM > 0 && (
          <div className="table-toolbar-row">
            <button type="button" className="btn btn-danger-ghost" onClick={purgeSpam}>
              <Icon name="trash" size={16} /> Delete all spam
            </button>
          </div>
        )}
      </div>
      <DataTable
        caption="Inquiries"
        rows={items}
        rowKey={(r) => r.id}
        empty={<EmptyState icon="inbox" title={status === "ALL" ? "No inquiries yet" : "Nothing here"} description="Messages from listing pages and the contact form appear here." />}
        columns={[
          {
            key: "contact",
            header: "Customer",
            cell: (r) => (
              <span>
                <button type="button" className={`table-title ${r.status === "NEW" ? "is-unread" : ""}`} onClick={() => setSelected(r.id)}>
                  {r.name}
                </button>
                <span className="table-sub">{r.email}</span>
              </span>
            ),
          },
          { key: "property", header: "Property", cell: (r) => <span className="table-clamp">{r.property?.title || "General inquiry"}</span> },
          { key: "message", header: "Message", hideOnMobile: true, cell: (r) => <span className="table-clamp table-sub">{r.message}</span> },
          { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
          { key: "agent", header: "Agent", hideOnMobile: true, cell: (r) => <span className="table-sub">{r.assignedTo?.name || r.assignedTo?.email || "—"}</span> },
          { key: "received", header: "Received", hideOnMobile: true, className: "nowrap", cell: (r) => <span className="table-sub">{formatRelative(r.createdAt)}</span> },
          {
            key: "actions",
            header: "Actions",
            className: "table-actions",
            cell: (r) => (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelected(r.id)}>
                Open
              </button>
            ),
          },
        ]}
      />
      <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / pageSize))} hrefFor={(p) => hrefWith({ page: p > 1 ? String(p) : null })} label="Inquiry pages" />
      <SlideOver open={!!open} onClose={() => setSelected(null)} title={open ? `Inquiry from ${open.name}` : "Inquiry"} description={open ? `Received ${formatRelative(open.createdAt)}` : undefined}>
        {open && <InquiryEditor key={open.id} inquiry={open} agents={agents} onSaved={closeAndRefresh} onDeleted={closeAndRefresh} />}
      </SlideOver>
    </>
  );
}
