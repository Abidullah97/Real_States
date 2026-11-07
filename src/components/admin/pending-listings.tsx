"use client";
import Image from "next/image";
import Link from "next/link";
import { usePropertyActions, type ActionTarget } from "@/components/admin/property-actions";
import { DataTable } from "@/components/dashboard/dashboard-ui";
import EmptyState from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { formatAmount, formatRelative } from "@/lib/format";

type Row = ActionTarget & { image: string | null; owner: string; price: number; currency: string; listingType: string; city: string; updatedAt: string | Date };

/** Listings owners have submitted for review, with one-click approve / reject-with-reason. */
export default function PendingListings({ items }: { items: Row[] }) {
  const { actionsFor } = usePropertyActions(true);
  return (
    <DataTable
      caption="Listings awaiting approval"
      rows={items}
      rowKey={(r) => r.id}
      empty={<EmptyState icon="check-circle" headingLevel={3} title="No listings waiting" description="Listings owners submit for review will appear here." />}
      columns={[
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
        { key: "owner", header: "Submitted by", hideOnMobile: true, cell: (r) => <span className="table-sub">{r.owner}</span> },
        { key: "price", header: "Price", className: "num nowrap", cell: (r) => `${formatAmount(r.price, r.currency)}${r.listingType === "RENT" ? " / mo" : ""}` },
        { key: "when", header: "Waiting", hideOnMobile: true, cell: (r) => <span className="table-sub">{formatRelative(r.updatedAt)}</span> },
        {
          key: "actions",
          header: "Actions",
          className: "table-actions",
          cell: (r) => {
            const [approve, reject] = actionsFor(r).filter((a) => a.label === "Approve & publish" || a.label === "Reject");
            return (
              <span className="inline-actions">
                {reject && (
                  <button type="button" className="btn btn-danger-ghost btn-sm" onClick={reject.onSelect}>
                    Reject
                  </button>
                )}
                {approve && (
                  <button type="button" className="btn btn-sm" onClick={approve.onSelect}>
                    <Icon name="check" size={15} /> Approve
                  </button>
                )}
              </span>
            );
          },
        },
      ]}
    />
  );
}
