"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { usePropertyActions } from "@/components/admin/property-actions";
import PropertyImageManager from "@/components/admin/property-image-manager";
import PropertyForm, { type FormOptions, type PropertyRow } from "@/components/dashboard/property-form";
import { Icon } from "@/components/ui/icon";
import SlideOver from "@/components/ui/slide-over";
import { useToast } from "@/components/ui/toast";

/** Primary actions for one listing, shown as buttons on its detail page. */
export default function PropertyDetailActions({ row, options }: { row: PropertyRow; options: FormOptions }) {
  const router = useRouter();
  const notify = useToast();
  const { actionsFor } = usePropertyActions(true);
  const [editing, setEditing] = useState(false);
  const actions = actionsFor(row, { afterDelete: () => router.push("/admin/properties") });

  return (
    <>
      <div className="detail-actions-bar">
        <button type="button" className="btn" onClick={() => setEditing(true)}>
          <Icon name="edit" size={16} /> Edit details & photos
        </button>
        {actions.map((a) =>
          a.href ? (
            <a key={a.label} href={a.href} target="_blank" rel="noreferrer" className="btn btn-secondary">
              <Icon name={a.icon} size={16} /> {a.label}
            </a>
          ) : (
            <button key={a.label} type="button" className={`btn ${a.tone === "danger" ? "btn-danger-ghost" : "btn-secondary"}`} onClick={a.onSelect}>
              <Icon name={a.icon} size={16} /> {a.label}
            </button>
          ),
        )}
      </div>
      <SlideOver open={editing} onClose={() => setEditing(false)} title={row.title} description={row.reference}>
        {editing && (
          <div className="edit-panel">
            <PropertyImageManager propertyId={row.id} images={row.images} />
            <PropertyForm
              isAdmin
              options={options}
              item={row}
              onSaved={(m) => {
                notify(m);
                router.refresh();
              }}
            />
          </div>
        )}
      </SlideOver>
    </>
  );
}
