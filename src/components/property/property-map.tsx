import { Icon } from "@/components/ui/icon";

export default function PropertyMap({ latitude, longitude, area }: { latitude?: number | null; longitude?: number | null; area: string }) {
  const key = process.env.NEXT_PUBLIC_MAP_API_KEY;
  const hasCoordinates = latitude !== undefined && latitude !== null && longitude !== undefined && longitude !== null;
  if (!hasCoordinates || !key) {
    return (
      <div className="map-fallback">
        <span className="map-fallback-icon">
          <Icon name="map" size={24} />
        </span>
        <div>
          <p className="map-fallback-area">{area}</p>
          <a className="text-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(area)}`} target="_blank" rel="noopener noreferrer">
            Open area in Google Maps <Icon name="external" size={14} />
          </a>
        </div>
      </div>
    );
  }
  const src = `https://www.google.com/maps/embed/v1/view?key=${encodeURIComponent(key)}&center=${latitude},${longitude}&zoom=14`;
  return <iframe className="property-map" src={src} title={`Map showing the approximate location near ${area}`} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />;
}
