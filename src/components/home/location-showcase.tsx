import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { pluralize } from "@/lib/format";
import type { LocationSummary } from "@/lib/property-data";

/** Image-led city cards. Counts and photos come from published listings in each city. */
export default function LocationShowcase({ locations }: { locations: LocationSummary[] }) {
  return (
    <ul className={`location-grid location-grid-${Math.min(locations.length, 4)}`}>
      {locations.map((l, index) => (
        <li key={l.city} className={index === 0 ? "location-card-lead" : undefined}>
          <Link href={`/properties?location=${encodeURIComponent(l.city)}`} className="location-card">
            {l.image ? (
              <Image src={l.image} alt="" fill sizes={index === 0 ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 768px) 100vw, 25vw"} />
            ) : (
              <span className="location-card-placeholder" aria-hidden="true">
                <Icon name="map" size={32} />
              </span>
            )}
            <span className="location-card-shade" aria-hidden="true" />
            <span className="location-card-text">
              <span className="location-card-count num">{pluralize(l.count, "property", "properties")}</span>
              <span className="location-card-name">{l.city}</span>
              <span className="location-card-action">
                Explore {l.city} <Icon name="arrow-right" size={16} />
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
