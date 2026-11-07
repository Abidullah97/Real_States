"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { DataTable } from "@/components/dashboard/dashboard-ui";
import RowActions from "@/components/dashboard/row-actions";
import Pagination from "@/components/property/pagination";
import { useConfirm } from "@/components/ui/confirm-dialog";
import EmptyState from "@/components/ui/empty-state";
import { Field, FormAlert, SubmitButton, submitJson, type FormMessage } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import SlideOver from "@/components/ui/slide-over";
import { useToast } from "@/components/ui/toast";

export type LocationRow = { id: string; country: string; province: string | null; city: string; area: string | null; locality: string | null; latitude: number | null; longitude: number | null; listings: number };
const LEVELS = [
  { value: "country", label: "Country" },
  { value: "province", label: "Province" },
  { value: "city", label: "City" },
  { value: "area", label: "Area" },
  { value: "locality", label: "Neighbourhood" },
];

function LocationForm({ item, onSaved }: { item?: LocationRow; onSaved: (m: string) => void }) {
  const [message, setMessage] = useState<FormMessage>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const j = await submitJson(item ? `/api/admin/locations/${item.id}` : "/api/admin/locations", item ? "PATCH" : "POST", Object.fromEntries(new FormData(e.currentTarget).entries()));
      onSaved(j.message);
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Location could not be saved." });
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form" onSubmit={submit}>
      {item && item.listings > 0 && <p className="form-note">Changes apply to all {item.listings} listings at this location.</p>}
      <div className="form-grid">
        <Field label="Country">
          <input className="input" name="country" required minLength={2} maxLength={60} defaultValue={item?.country || "Pakistan"} />
        </Field>
        <Field label="Province" optional>
          <input className="input" name="province" maxLength={80} defaultValue={item?.province || ""} />
        </Field>
        <Field label="City">
          <input className="input" name="city" required minLength={2} maxLength={100} defaultValue={item?.city} />
        </Field>
        <Field label="Area" optional>
          <input className="input" name="area" maxLength={100} defaultValue={item?.area || ""} />
        </Field>
        <Field label="Neighbourhood" optional className="span-full">
          <input className="input" name="locality" maxLength={100} defaultValue={item?.locality || ""} />
        </Field>
        <Field label="Latitude" optional hint="Approximate; used for the map.">
          <input className="input" name="latitude" type="number" step="any" min={-90} max={90} defaultValue={item?.latitude ?? ""} />
        </Field>
        <Field label="Longitude" optional>
          <input className="input" name="longitude" type="number" step="any" min={-180} max={180} defaultValue={item?.longitude ?? ""} />
        </Field>
      </div>
      <FormAlert message={message} />
      <div className="form-actions">
        <SubmitButton busy={busy} busyLabel="Saving…">
          {item ? "Save location" : "Create location"}
        </SubmitButton>
      </div>
    </form>
  );
}

function RenameForm({ values, onSaved }: { values: Record<string, string[]>; onSaved: (m: string) => void }) {
  const [level, setLevel] = useState("city");
  const [message, setMessage] = useState<FormMessage>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const j = await submitJson("/api/admin/locations", "PATCH", Object.fromEntries(new FormData(e.currentTarget).entries()));
      onSaved(j.message);
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Rename failed." });
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form" onSubmit={submit}>
      <p className="form-note">Fix a spelling or merge duplicates (e.g. “Isb” → “Islamabad”). Every location using the old name is updated; listings keep their locations.</p>
      <Field label="Level">
        <select className="select" name="level" value={level} onChange={(e) => setLevel(e.target.value)}>
          {LEVELS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Current name">
        <select className="select" name="from" required defaultValue="">
          <option value="" disabled>
            Choose…
          </option>
          {(values[level] || []).map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </Field>
      <Field label="New name">
        <input className="input" name="to" required minLength={2} maxLength={100} />
      </Field>
      <FormAlert message={message} />
      <div className="form-actions">
        <SubmitButton busy={busy} busyLabel="Renaming…">
          Rename everywhere
        </SubmitButton>
      </div>
    </form>
  );
}

export default function LocationsManager({ items, total, page, pageSize, values, filters }: { items: LocationRow[]; total: number; page: number; pageSize: number; values: Record<string, string[]>; filters: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const confirm = useConfirm();
  const notify = useToast();
  const pageHref = (p: number) => {
    const q = new URLSearchParams(searchParams.toString());
    if (p > 1) q.set("page", String(p));
    else q.delete("page");
    return `?${q}`;
  };
  const [panel, setPanel] = useState<"create" | "rename" | null>(null);
  const [editing, setEditing] = useState<LocationRow | null>(null);

  const done = (m: string) => {
    notify(m);
    setPanel(null);
    setEditing(null);
    router.refresh();
  };

  async function remove(l: LocationRow) {
    if (!(await confirm({ title: `Remove ${l.locality || l.city}?`, description: "This location has no listings and will be permanently removed.", confirmLabel: "Remove", tone: "danger" }))) return;
    try {
      const r = await fetch(`/api/admin/locations/${l.id}`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      done(j.message);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Location could not be removed.", "error");
    }
  }

  return (
    <>
      <div className="table-toolbar">
        {filters}
        <div className="table-toolbar-row">
          <p className="table-count table-count-start">{total} locations</p>
          <button type="button" className="btn btn-secondary" onClick={() => setPanel("rename")}>
            <Icon name="edit" size={16} /> Rename a place
          </button>
          <button type="button" className="btn" onClick={() => setPanel("create")}>
            <Icon name="plus" size={17} /> Add location
          </button>
        </div>
      </div>
      <DataTable
        caption="Locations"
        rows={items}
        rowKey={(l) => l.id}
        empty={<EmptyState icon="map-pinned" title="No locations match" description="Try another filter, or add a location." />}
        columns={[
          {
            key: "place",
            header: "Location",
            cell: (l) => (
              <span>
                <button type="button" className="table-title" onClick={() => setEditing(l)}>
                  {l.locality || l.area || l.city}
                </button>
                <span className="table-sub">{[l.locality ? l.area : null, l.city, l.province, l.country].filter(Boolean).join(" › ")}</span>
              </span>
            ),
          },
          { key: "listings", header: "Listings", className: "num", cell: (l) => (l.listings ? <Link href={`/admin/properties?city=${encodeURIComponent(l.city)}`}>{l.listings}</Link> : 0) },
          { key: "map", header: "Map", hideOnMobile: true, cell: (l) => <span className="table-sub">{l.latitude !== null && l.longitude !== null ? `${l.latitude.toFixed(3)}, ${l.longitude.toFixed(3)}` : "No coordinates"}</span> },
          {
            key: "actions",
            header: "Actions",
            className: "table-actions",
            cell: (l) => (
              <RowActions
                label={l.locality || l.city}
                actions={[
                  { label: "Edit", icon: "edit", onSelect: () => setEditing(l) },
                  ...(l.listings === 0 ? [{ label: "Remove", icon: "trash", tone: "danger" as const, onSelect: () => remove(l) }] : []),
                ]}
              />
            ),
          },
        ]}
      />
      <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / pageSize))} hrefFor={pageHref} label="Location pages" />
      <SlideOver open={panel === "create"} onClose={() => setPanel(null)} title="Add a location">
        <LocationForm onSaved={done} />
      </SlideOver>
      <SlideOver open={panel === "rename"} onClose={() => setPanel(null)} title="Rename a place">
        <RenameForm values={values} onSaved={done} />
      </SlideOver>
      <SlideOver open={!!editing} onClose={() => setEditing(null)} title={editing ? `Edit ${editing.locality || editing.city}` : "Edit location"}>
        {editing && <LocationForm key={editing.id} item={editing} onSaved={done} />}
      </SlideOver>
    </>
  );
}
