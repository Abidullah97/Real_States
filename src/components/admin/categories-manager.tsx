"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { DataTable } from "@/components/dashboard/dashboard-ui";
import RowActions from "@/components/dashboard/row-actions";
import { useConfirm } from "@/components/ui/confirm-dialog";
import EmptyState from "@/components/ui/empty-state";
import { Field, FormAlert, SubmitButton, submitJson, type FormMessage } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import SlideOver from "@/components/ui/slide-over";
import { useToast } from "@/components/ui/toast";

export type CategoryRow = { id: string; name: string; slug: string; description: string | null; position: number; total: number; published: number };

function CategoryForm({ item, onSaved }: { item?: CategoryRow; onSaved: (m: string) => void }) {
  const [message, setMessage] = useState<FormMessage>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const j = await submitJson(item ? `/api/admin/categories/${item.id}` : "/api/admin/categories", item ? "PATCH" : "POST", Object.fromEntries(new FormData(e.currentTarget).entries()));
      onSaved(j.message);
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Category could not be saved." });
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form" onSubmit={submit}>
      {item && item.total > 0 && (
        <p className="alert alert-info">
          <Icon name="info" size={18} />
          <span>Renaming updates all {item.total} listings in this category automatically.</span>
        </p>
      )}
      <Field label="Name" hint="Singular, e.g. “Office” or “Agricultural Land”.">
        <input className="input" name="name" required minLength={2} maxLength={60} defaultValue={item?.name} />
      </Field>
      <Field label="Description" optional>
        <textarea className="textarea" name="description" maxLength={300} rows={3} defaultValue={item?.description || ""} />
      </Field>
      <Field label="Display order" hint="Lower numbers appear first in forms and filters.">
        <input className="input" name="position" type="number" min={0} max={1000} defaultValue={item?.position ?? 0} />
      </Field>
      <FormAlert message={message} />
      <div className="form-actions">
        <SubmitButton busy={busy} busyLabel="Saving…">
          {item ? "Save category" : "Create category"}
        </SubmitButton>
      </div>
    </form>
  );
}

export default function CategoriesManager({ items }: { items: CategoryRow[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const notify = useToast();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [deleting, setDeleting] = useState<CategoryRow | null>(null);
  const [moveTo, setMoveTo] = useState("");

  const done = (m: string) => {
    notify(m);
    setCreating(false);
    setEditing(null);
    setDeleting(null);
    router.refresh();
  };

  async function destroy(row: CategoryRow, target?: string) {
    try {
      const r = await fetch(`/api/admin/categories/${row.id}${target ? `?moveTo=${encodeURIComponent(target)}` : ""}`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      done(j.message);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Delete failed.", "error");
    }
  }

  async function startDelete(row: CategoryRow) {
    if (row.total > 0) {
      setMoveTo("");
      setDeleting(row);
      return;
    }
    if (await confirm({ title: `Delete “${row.name}”?`, description: "No listings use this category.", confirmLabel: "Delete category", tone: "danger" })) destroy(row);
  }

  return (
    <>
      <div className="table-toolbar">
        <div className="table-toolbar-row">
          <p className="table-count table-count-start">{items.length} categories</p>
          <button type="button" className="btn" onClick={() => setCreating(true)}>
            <Icon name="plus" size={17} /> Add category
          </button>
        </div>
      </div>
      <DataTable
        caption="Property categories"
        rows={items}
        rowKey={(c) => c.id}
        empty={<EmptyState icon="tags" title="No categories" description="Create categories to classify listings." />}
        columns={[
          {
            key: "name",
            header: "Category",
            cell: (c) => (
              <span>
                <button type="button" className="table-title" onClick={() => setEditing(c)}>
                  {c.name}
                </button>
                <span className="table-sub">{c.description || `/${c.slug}`}</span>
              </span>
            ),
          },
          { key: "published", header: "Published", className: "num", cell: (c) => c.published },
          { key: "total", header: "All listings", className: "num", cell: (c) => c.total },
          { key: "position", header: "Order", className: "num", hideOnMobile: true, cell: (c) => c.position },
          {
            key: "actions",
            header: "Actions",
            className: "table-actions",
            cell: (c) => (
              <RowActions
                label={c.name}
                actions={[
                  { label: "Edit", icon: "edit", onSelect: () => setEditing(c) },
                  { label: "View listings", icon: "building", onSelect: () => router.push(`/admin/properties?type=${encodeURIComponent(c.name)}`) },
                  { label: "Delete", icon: "trash", tone: "danger", onSelect: () => startDelete(c) },
                ]}
              />
            ),
          },
        ]}
      />
      <SlideOver open={creating} onClose={() => setCreating(false)} title="Add a category">
        <CategoryForm onSaved={done} />
      </SlideOver>
      <SlideOver open={!!editing} onClose={() => setEditing(null)} title={editing ? `Edit “${editing.name}”` : "Edit category"}>
        {editing && <CategoryForm key={editing.id} item={editing} onSaved={done} />}
      </SlideOver>
      <SlideOver open={!!deleting} onClose={() => setDeleting(null)} title={deleting ? `Delete “${deleting.name}”` : "Delete category"} description="Existing listings are protected: move them to another category first.">
        {deleting && (
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              if (moveTo) destroy(deleting, moveTo);
            }}
          >
            <p className="alert alert-warning">
              <Icon name="alert" size={18} />
              <span>
                {deleting.total} listing{deleting.total === 1 ? " uses" : "s use"} this category. Choose where to move {deleting.total === 1 ? "it" : "them"} before deleting.{" "}
                <Link href={`/admin/properties?type=${encodeURIComponent(deleting.name)}`}>Review listings</Link>
              </span>
            </p>
            <label className="field">
              <span className="field-label">Move listings to</span>
              <select className="select" value={moveTo} onChange={(e) => setMoveTo(e.target.value)} required>
                <option value="" disabled>
                  Choose a category…
                </option>
                {items
                  .filter((c) => c.id !== deleting.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </label>
            <div className="form-actions">
              <button type="submit" className="btn btn-danger" disabled={!moveTo}>
                Move listings & delete
              </button>
            </div>
          </form>
        )}
      </SlideOver>
    </>
  );
}
