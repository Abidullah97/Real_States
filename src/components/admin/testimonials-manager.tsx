"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { DataTable } from "@/components/dashboard/dashboard-ui";
import RowActions from "@/components/dashboard/row-actions";
import { useConfirm } from "@/components/ui/confirm-dialog";
import EmptyState from "@/components/ui/empty-state";
import { Field, FormAlert, SubmitButton, submitJson, type FormMessage } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import SlideOver from "@/components/ui/slide-over";
import StatusBadge from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/format";

export type TestimonialRow = { id: string; name: string; context: string | null; quote: string; rating: number | null; published: boolean; position: number; updatedAt: Date | string };

function TestimonialForm({ item, onSaved }: { item?: TestimonialRow; onSaved: (m: string) => void }) {
  const [message, setMessage] = useState<FormMessage>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const d = Object.fromEntries(new FormData(e.currentTarget).entries());
    const body = { name: d.name, context: d.context, quote: d.quote, rating: d.rating ? Number(d.rating) : null, position: Number(d.position || 0), published: d.published === "on" };
    try {
      const j = await submitJson(item ? `/api/admin/testimonials/${item.id}` : "/api/admin/testimonials", item ? "PATCH" : "POST", body);
      onSaved(j.message);
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Testimonial could not be saved." });
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form" onSubmit={submit}>
      <div className="alert alert-info">
        <Icon name="info" size={18} />
        <span>Only publish testimonials you have permission to use, quoted from real customers.</span>
      </div>
      <div className="form-grid">
        <Field label="Customer name">
          <input className="input" name="name" required minLength={2} maxLength={100} defaultValue={item?.name} />
        </Field>
        <Field label="Context" optional hint="e.g. “Bought a home in DHA Phase 6”">
          <input className="input" name="context" maxLength={120} defaultValue={item?.context || ""} />
        </Field>
        <Field label="Quote" className="span-full" hint="20–1200 characters.">
          <textarea className="textarea" name="quote" required minLength={20} maxLength={1200} rows={5} defaultValue={item?.quote} />
        </Field>
        <Field label="Rating" optional>
          <select className="select" name="rating" defaultValue={item?.rating ? String(item.rating) : ""}>
            <option value="">No rating</option>
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>
                {r} out of 5
              </option>
            ))}
          </select>
        </Field>
        <Field label="Display order" hint="Lower numbers appear first.">
          <input className="input" name="position" type="number" min={0} max={1000} defaultValue={item?.position ?? 0} />
        </Field>
      </div>
      <label className="checkbox">
        <input type="checkbox" name="published" defaultChecked={item?.published ?? false} />
        <span>
          Publish on the homepage
          <small>Unpublished testimonials are only visible here.</small>
        </span>
      </label>
      <FormAlert message={message} />
      <div className="form-actions">
        <SubmitButton busy={busy} busyLabel="Saving…">
          {item ? "Save changes" : "Add testimonial"}
        </SubmitButton>
      </div>
    </form>
  );
}

export default function TestimonialsManager({ items }: { items: TestimonialRow[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const notify = useToast();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = items.find((t) => t.id === editingId);

  async function setPublished(t: TestimonialRow, published: boolean) {
    try {
      await submitJson(`/api/admin/testimonials/${t.id}`, "PATCH", { published });
      notify(published ? `Testimonial from ${t.name} published.` : `Testimonial from ${t.name} hidden.`);
      router.refresh();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Update failed.", "error");
    }
  }

  async function remove(t: TestimonialRow) {
    if (!(await confirm({ title: `Delete the testimonial from ${t.name}?`, description: "It will be removed permanently.", confirmLabel: "Delete", tone: "danger" }))) return;
    try {
      const r = await fetch(`/api/admin/testimonials/${t.id}`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      notify(j.message);
      router.refresh();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Delete failed.", "error");
    }
  }

  const saved = (m: string) => {
    notify(m);
    setCreating(false);
    setEditingId(null);
    router.refresh();
  };

  return (
    <>
      <div className="table-toolbar">
        <div className="table-toolbar-row">
          <p className="table-count table-count-start">
            {items.filter((t) => t.published).length} of {items.length} published
          </p>
          <button type="button" className="btn" onClick={() => setCreating(true)}>
            <Icon name="plus" size={17} /> Add testimonial
          </button>
        </div>
      </div>
      <DataTable
        caption="Testimonials"
        rows={items}
        rowKey={(t) => t.id}
        empty={
          <EmptyState
            icon="message"
            title="No testimonials yet"
            description="Add feedback from real customers. The homepage testimonial section stays hidden until at least one is published."
            action={
              <button type="button" className="btn" onClick={() => setCreating(true)}>
                Add testimonial
              </button>
            }
          />
        }
        columns={[
          {
            key: "who",
            header: "Customer",
            cell: (t) => (
              <span>
                <button type="button" className="table-title" onClick={() => setEditingId(t.id)}>
                  {t.name}
                </button>
                <span className="table-sub">{t.context || "—"}</span>
              </span>
            ),
          },
          { key: "quote", header: "Quote", hideOnMobile: true, cell: (t) => <span className="table-clamp table-sub">“{t.quote}”</span> },
          { key: "status", header: "Status", cell: (t) => <StatusBadge status={t.published ? "PUBLISHED" : "DRAFT"} label={t.published ? "Published" : "Hidden"} /> },
          { key: "order", header: "Order", hideOnMobile: true, className: "num", cell: (t) => t.position },
          { key: "updated", header: "Updated", hideOnMobile: true, className: "nowrap", cell: (t) => <span className="table-sub">{formatDate(t.updatedAt)}</span> },
          {
            key: "actions",
            header: "Actions",
            className: "table-actions",
            cell: (t) => (
              <RowActions
                label={t.name}
                actions={[
                  { label: "Edit", icon: "edit", onSelect: () => setEditingId(t.id) },
                  t.published ? { label: "Hide from homepage", icon: "eye-off", onSelect: () => setPublished(t, false) } : { label: "Publish", icon: "eye", onSelect: () => setPublished(t, true) },
                  { label: "Delete", icon: "trash", tone: "danger", onSelect: () => remove(t) },
                ]}
              />
            ),
          },
        ]}
      />
      <SlideOver open={creating} onClose={() => setCreating(false)} title="Add a testimonial">
        <TestimonialForm onSaved={saved} />
      </SlideOver>
      <SlideOver open={!!editing} onClose={() => setEditingId(null)} title={editing ? `Testimonial from ${editing.name}` : "Testimonial"}>
        {editing && <TestimonialForm key={editing.id} item={editing} onSaved={saved} />}
      </SlideOver>
    </>
  );
}
