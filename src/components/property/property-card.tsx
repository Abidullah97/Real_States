import Image from "next/image";
import Link from "next/link";
import FavoriteButton from "@/components/property/favorite-button";
import { Icon } from "@/components/ui/icon";
import type { Property } from "@/lib/properties";

export function PriceTag({ label, className = "" }: { label: string; className?: string }) {
  const [amount, period] = label.split(" / ");
  return (
    <p className={`price-tag num ${className}`}>
      {amount}
      {period && <span> / {period}</span>}
    </p>
  );
}

export function SpecList({ property, className = "" }: { property: Property; className?: string }) {
  return (
    <ul className={`spec-list ${className}`} aria-label="Key specifications">
      {property.beds > 0 && (
        <li>
          <Icon name="bed" size={17} />
          <span className="num">{property.beds}</span> {property.beds === 1 ? "bed" : "beds"}
        </li>
      )}
      {property.baths > 0 && (
        <li>
          <Icon name="bath" size={17} />
          <span className="num">{property.baths}</span> {property.baths === 1 ? "bath" : "baths"}
        </li>
      )}
      <li>
        <Icon name="area" size={17} />
        <span className="num">{property.area.toLocaleString("en-US")}</span> {property.unit}
      </li>
    </ul>
  );
}

export default function PropertyCard({
  property,
  variant = "grid",
  priority = false,
  headingLevel = 3,
}: {
  property: Property;
  variant?: "grid" | "list";
  priority?: boolean;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const sizes = variant === "list" ? "(max-width: 640px) 100vw, 340px" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px";
  return (
    <article className={`property-card property-card-${variant}`}>
      <div className="property-card-media">
        <Image src={property.image} alt="" fill sizes={sizes} priority={priority} />
        <div className="property-card-badges">
          <span className="badge badge-overlay">{property.status}</span>
          {property.featured && <span className="badge badge-dark">Featured</span>}
        </div>
      </div>
      <FavoriteButton slug={property.slug} title={property.title} />
      <div className="property-card-body">
        <PriceTag label={property.priceLabel} className="property-card-price" />
        <Heading className="property-card-title">
          <Link href={`/properties/${property.slug}`} className="stretched-link">
            {property.title}
          </Link>
        </Heading>
        <p className="property-card-location">
          <Icon name="pin" size={15} />
          <span>{property.location}</span>
        </p>
        <SpecList property={property} className="property-card-specs" />
        <div className="property-card-foot">
          <span className="property-card-type">
            {property.kind}
            {variant === "list" && property.reference && <> · Ref. {property.reference}</>}
          </span>
          {/* The whole card is one link; this is a visual affordance, hidden from assistive tech to avoid a duplicate link. */}
          <span className="property-card-cta" aria-hidden="true">
            View details <Icon name="arrow-right" size={15} />
          </span>
        </div>
      </div>
    </article>
  );
}
