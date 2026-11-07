import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container detail-page" role="status" aria-label="Loading property">
      <Skeleton className="skeleton-text" style={{ width: 260 }} />
      <div className="detail-head">
        <div style={{ flex: 1 }}>
          <Skeleton className="skeleton-text" style={{ width: 140 }} />
          <Skeleton className="skeleton-title" style={{ width: "min(480px, 90%)", height: 44, marginTop: 16 }} />
          <Skeleton className="skeleton-text" style={{ width: 220, marginTop: 14 }} />
        </div>
        <Skeleton className="skeleton-title" style={{ width: 200, height: 36 }} />
      </div>
      <div className="gallery gallery-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="gallery-tile" />
        ))}
      </div>
      <div className="detail-layout">
        <div className="detail-main">
          <Skeleton style={{ height: 96, borderRadius: 18 }} />
          <Skeleton className="skeleton-text" style={{ width: "92%", marginTop: 40 }} />
          <Skeleton className="skeleton-text" style={{ width: "86%", marginTop: 12 }} />
          <Skeleton className="skeleton-text" style={{ width: "64%", marginTop: 12 }} />
        </div>
        <Skeleton className="detail-aside" style={{ height: 520, borderRadius: 18 }} />
      </div>
    </div>
  );
}
