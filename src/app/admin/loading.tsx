import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading">
      <div className="dash-page-head">
        <div>
          <Skeleton className="skeleton-title" style={{ width: 280 }} />
          <Skeleton className="skeleton-text" style={{ width: 360, marginTop: 12 }} />
        </div>
      </div>
      <div className="stat-grid">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} style={{ height: 120, borderRadius: 16 }} />
        ))}
      </div>
      <Skeleton style={{ height: 320, borderRadius: 16, marginTop: 24 }} />
    </div>
  );
}
