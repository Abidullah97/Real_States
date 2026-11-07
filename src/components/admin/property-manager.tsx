"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { usePropertyActions } from "@/components/admin/property-actions";
import PropertyImageManager from "@/components/admin/property-image-manager";
import { DataTable } from "@/components/dashboard/dashboard-ui";
import PropertyForm, { type FormOptions, type PropertyRow } from "@/components/dashboard/property-form";
import RowActions from "@/components/dashboard/row-actions";
import Pagination from "@/components/property/pagination";
import EmptyState from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import SlideOver from "@/components/ui/slide-over";
import StatusBadge from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { formatAmount, formatDate, pluralize } from "@/lib/format";

const STATUS_TABS = ["ALL", "PUBLISHED", "PENDING", "DRAFT", "REJECTED", "SOLD", "RENTED", "ARCHIVED"] as const;
const TAB_LABEL: Record<string, string> = { ALL: "All", PUBLISHED: "Published", PENDING: "Pending", DRAFT: "Drafts", REJECTED: "Rejected", SOLD: "Sold", RENTED: "Rented", ARCHIVED: "Archived" };

type Props = {
  items: PropertyRow[];
  isAdmin?: boolean;
  total?: number;
  page?: number;
  pageSize?: number;
  status?: string;
  counts?: Record<string, number>;
  openCreate?: boolean;
  options: FormOptions;
  filters?: React.ReactNode;
  detailsBase?: string;
};

export default function AdminPropertyManager({ items, isAdmin = true, total = items.length, page = 1, pageSize = items.length || 1, status = "ALL", counts, openCreate = false, options, filters, detailsBase }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const notify = useToast();
  const { actionsFor } = usePropertyActions(isAdmin);
  const [creating, setCreating] = useState(openCreate);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = items.find((i) => i.id === editingId);

  const hrefWith = (patch: Record<string, string | null>) => {
    const q = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "" || v === "ALL") q.delete(k);
      else q.set(k, v);
    }
    q.delete("new");
    return `${pathname}${q.toString() ? `?${q}` : ""}`;
  };
  const filtered = searchParams.toString().replace(/(^|&)(new|page)=[^&]*/g, "") !== "";

  return (
    <>
      {counts && (
        <nav className="status-tabs" aria-label="Filter by status">
          {STATUS_TABS.map((s) => (
            <Link key={s} href={hrefWith({ status: s, page: null })} aria-current={status === s ? "page" : undefined}>
              {TAB_LABEL[s]} <span className="num">{counts[s] ?? 0}</span>
            </Link>
          ))}
        </nav>
      )}
      <div className="table-toolbar property-toolbar">
        {filters}
        <div className="table-toolbar-row">
          <p className="table-count table-count-start">{pluralize(total, "listing")}</p>
          <button type="button" className="btn" onClick={() => setCreating(true)}>
            <Icon name="plus" size={17} /> {isAdmin ? "Add property" : "New listing"}
          </button>
        </div>
      </div>

      <DataTable
        caption="Property listings"
        rows={items}
        rowKey={(r) => r.id}
        empty={
          <EmptyState
            icon="building"
            title={filtered ? "No listings match" : isAdmin ? "No listings yet" : "You don’t have any listings yet"}
            description={filtered ? "Try a different search or remove a filter." : "Create a listing to get started."}
            action={
              filtered ? (
                <Link href={pathname} className="btn btn-secondary">
                  Clear filters
                </Link>
              ) : (
                <button type="button" className="btn" onClick={() => setCreating(true)}>
                  Create a listing
                </button>
              )
            }
          />
        }
        columns={[
          {
            key: "property",
            header: "Property",
            cell: (r) => (
              <div className="table-property">
                <span className="table-thumb">{r.images[0] ? <Image src={r.images[0].url} alt="" fill sizes="56px" /> : <Icon name="image" size={18} />}</span>
                <span>
                  {detailsBase ? (
                    <Link href={`${detailsBase}/${r.id}`} className="table-title">
                      {r.title}
                    </Link>
                  ) : (
                    <button type="button" className="table-title" onClick={() => setEditingId(r.id)}>
                      {r.title}
                    </button>
                  )}
                  <span className="table-sub num">
                    {r.reference} · {r.propertyType}
                  </span>
                </span>
              </div>
            ),
          },
          { key: "price", header: "Price", className: "num nowrap", cell: (r) => `${formatAmount(Number(r.price), r.currency)}${r.listingType === "RENT" ? " / mo" : ""}` },
          { key: "location", header: "Location", hideOnMobile: true, cell: (r) => [r.location.locality, r.location.city].filter(Boolean).join(", ") },
          ...(isAdmin ? [{ key: "agent", header: "Agent", hideOnMobile: true, cell: (r: PropertyRow) => <span className="table-sub">{r.agent?.name || r.agent?.email || "—"}</span> }] : []),
          {
            key: "status",
            header: "Status",
            cell: (r) => (
              <span className="table-badges">
                <StatusBadge status={r.status} />
                {r.featured && (
                  <span className="badge badge-accent" title="Featured">
                    <Icon name="star" size={12} /> Featured
                  </span>
                )}
              </span>
            ),
          },
          { key: "created", header: "Created", hideOnMobile: true, className: "nowrap", cell: (r) => <span className="table-sub">{r.createdAt ? formatDate(r.createdAt) : formatDate(r.updatedAt)}</span> },
          {
            key: "actions",
            header: "Actions",
            className: "table-actions",
            cell: (r) => <RowActions label={r.title} actions={actionsFor(r, { onEdit: () => setEditingId(r.id), detailsHref: detailsBase ? `${detailsBase}/${r.id}` : undefined })} />,
          },
        ]}
      />

      <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / pageSize))} hrefFor={(p) => hrefWith({ page: p > 1 ? String(p) : null })} label="Listing pages" />

      <SlideOver open={creating} onClose={() => setCreating(false)} title={isAdmin ? "Add a property" : "Create a listing"} description="Photos can be added after the listing is created.">
        <PropertyForm
          isAdmin={isAdmin}
          options={options}
          onSaved={(m) => {
            notify(m);
            setCreating(false);
            router.refresh();
          }}
        />
      </SlideOver>

      <SlideOver open={!!editing} onClose={() => setEditingId(null)} title={editing ? editing.title : "Edit listing"} description={editing ? `${editing.reference} · last updated ${formatDate(editing.updatedAt)}` : undefined}>
        {editing && (
          <div className="edit-panel">
            <div className="edit-panel-status">
              <StatusBadge status={editing.status} />
              {editing.status === "PUBLISHED" && (
                <a href={`/properties/${editing.slug}`} target="_blank" rel="noreferrer" className="text-link">
                  View on website <Icon name="external" size={14} />
                </a>
              )}
            </div>
            <PropertyImageManager propertyId={editing.id} images={editing.images} />
            <PropertyForm
              key={editing.id}
              isAdmin={isAdmin}
              options={options}
              item={editing}
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
