import { Skeleton, PropertyGridSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container listings-page">
      <div className="page-head">
        <Skeleton className="skeleton-text" style={{ width: 180 }} />
        <Skeleton className="skeleton-title" style={{ width: "min(420px, 80%)", height: 40, marginTop: 24 }} />
        <Skeleton className="skeleton-text" style={{ width: "min(560px, 90%)", marginTop: 16 }} />
      </div>
      <Skeleton style={{ height: 64, borderRadius: 16 }} />
      <div className="listings-layout">
        <Skeleton className="filters-panel" style={{ height: 420, borderRadius: 18 }} />
        <div className="listings-results">
          <Skeleton className="skeleton-text" style={{ width: 200, height: 20, margin: "8px 0 28px" }} />
          <PropertyGridSkeleton count={6} />
        </div>
      </div>
    </div>
  );
}
