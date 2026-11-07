import { Icon } from "@/components/ui/icon";
import { formatArea, formatDate } from "@/lib/format";
import type { Property } from "@/lib/properties";

/** Prominent icon row of the most important specifications. Zero-value rooms are omitted (e.g. land). */
export function SpecificationRow({ property }: { property: Property }) {
  const items = [
    property.beds > 0 && { icon: "bed", value: property.beds, label: property.beds === 1 ? "Bedroom" : "Bedrooms" },
    property.baths > 0 && { icon: "bath", value: property.baths, label: property.baths === 1 ? "Bathroom" : "Bathrooms" },
    { icon: "area", value: formatArea(property.area, property.unit), label: "Floor area" },
    property.parking ? { icon: "car", value: property.parking, label: property.parking === 1 ? "Parking space" : "Parking spaces" } : null,
    { icon: property.kind === "Apartment" ? "building" : "home", value: property.kind, label: "Property type" },
  ].filter(Boolean) as { icon: string; value: string | number; label: string }[];

  return (
    <ul className="spec-row" aria-label="Specifications">
      {items.map((item) => (
        <li key={item.label}>
          <Icon name={item.icon} size={22} />
          <strong className="num">{item.value}</strong>
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

/** Detailed key/value table. Only fields that exist on the listing are shown. */
export function PropertyFacts({ property }: { property: Property }) {
  const rows: [string, string | number][] = [
    ["Reference", property.reference || ""],
    ["Listing type", property.status],
    ["Property type", property.kind],
    ["Price", property.priceLabel],
    ["Bedrooms", property.beds > 0 ? property.beds : ""],
    ["Bathrooms", property.baths > 0 ? property.baths : ""],
    ["Floor area", formatArea(property.area, property.unit)],
    ["Parking", property.parking ? property.parking : ""],
    ["Location", property.location],
    ["Listed", property.publishedAt && !property.isDemo ? formatDate(property.publishedAt) : ""],
  ];
  return (
    <dl className="facts">
      {rows
        .filter(([, value]) => value !== "")
        .map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd className="num">{value}</dd>
          </div>
        ))}
    </dl>
  );
}
