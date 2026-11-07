export function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <span className={`skeleton ${className}`} style={{ display: "block", ...style }} aria-hidden="true" />;
}

export function PropertyCardSkeleton({ variant = "grid" }: { variant?: "grid" | "list" }) {
  return (
    <div className={`property-card property-card-${variant} is-skeleton`} aria-hidden="true">
      <Skeleton className="property-card-media" />
      <div className="property-card-body">
        <Skeleton className="skeleton-title" style={{ width: "48%" }} />
        <Skeleton className="skeleton-text" style={{ width: "78%", marginTop: 12 }} />
        <Skeleton className="skeleton-text" style={{ width: "56%", marginTop: 10 }} />
        <Skeleton className="skeleton-text" style={{ width: "88%", marginTop: 22 }} />
      </div>
    </div>
  );
}

export function PropertyGridSkeleton({ count = 6, variant = "grid" }: { count?: number; variant?: "grid" | "list" }) {
  return (
    <div className={variant === "list" ? "property-list" : "property-grid"} role="status" aria-label="Loading properties">
      {Array.from({ length: count }, (_, i) => (
        <PropertyCardSkeleton key={i} variant={variant} />
      ))}
    </div>
  );
}
