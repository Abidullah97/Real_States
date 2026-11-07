import Image from "next/image";
import Link from "next/link";
import FavoriteButton from "@/components/property/favorite-button";
import EmptyState from "@/components/ui/empty-state";
import StatusBadge from "@/components/ui/status-badge";
import { formatPrice } from "@/lib/format";

type Item = {
  propertyId: string;
  property: {
    slug: string;
    title: string;
    status: string;
    price: unknown;
    currency: string;
    listingType: "SALE" | "RENT";
    location: { city: string; locality: string | null };
    images: { url: string }[];
  };
};

export default function SavedHomeList({ items }: { items: Item[] }) {
  if (!items.length)
    return (
      <EmptyState
        icon="heart"
        headingLevel={3}
        title="No saved homes yet"
        description="Tap the heart on any listing to keep it here for later."
        action={
          <Link href="/properties" className="btn btn-sm">
            Browse properties
          </Link>
        }
      />
    );
  return (
    <ul className="saved-grid">
      {items.map(({ propertyId, property: p }) => {
        const live = p.status === "PUBLISHED";
        return (
          <li key={propertyId} className="saved-card">
            <div className="saved-card-media">
              {p.images[0] && <Image src={p.images[0].url} alt="" fill sizes="(max-width: 640px) 100vw, 280px" />}
              {live && <FavoriteButton slug={p.slug} title={p.title} initial refreshOnChange />}
            </div>
            <div className="saved-card-body">
              <p className="saved-card-price num">{formatPrice(Number(p.price), p.currency, p.listingType)}</p>
              {live ? (
                <Link href={`/properties/${p.slug}`} className="saved-card-title stretched-link">
                  {p.title}
                </Link>
              ) : (
                <p className="saved-card-title">{p.title}</p>
              )}
              <p className="table-sub">{[p.location.locality, p.location.city].filter(Boolean).join(", ")}</p>
              {!live && <StatusBadge status={p.status} label="No longer available" />}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
