"use client";
import Link from "next/link";
import BrandLogo from "@/components/ui/brand-logo";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="status-page status-page-standalone">
      <div className="container-narrow">
        <BrandLogo />
        <h1>Something went wrong</h1>
        <p className="lead">We couldn’t load this page. This is usually temporary — please try again in a moment.</p>
        <div className="form-actions">
          <button type="button" className="btn btn-lg" onClick={() => reset()}>
            Try again
          </button>
          <Link href="/" className="btn btn-lg btn-secondary">
            Return home
          </Link>
        </div>
      </div>
    </main>
  );
}
