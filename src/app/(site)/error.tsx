"use client";
import Link from "next/link";

export default function SiteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="status-page">
      <div className="container-narrow">
        <p className="eyebrow">Temporary problem</p>
        <h1>We couldn’t load this page</h1>
        <p className="lead">Something went wrong on our side. Please try again in a moment.</p>
        <div className="form-actions">
          <button type="button" className="btn btn-lg" onClick={() => reset()}>
            Try again
          </button>
          <Link href="/properties" className="btn btn-lg btn-secondary">
            Browse properties
          </Link>
        </div>
      </div>
    </div>
  );
}
