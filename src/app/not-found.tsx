import Link from "next/link";
import SiteHeader from "@/components/site/site-header";
import SiteFooter from "@/components/site/site-footer";
import { Icon } from "@/components/ui/icon";
import { getViewer } from "@/lib/authorization";
import { getLocationSummaries } from "@/lib/property-data";
import { getSiteSettings } from "@/lib/site-content";

export default async function NotFound() {
  const [viewer, locations, settings] = await Promise.all([getViewer(), getLocationSummaries(5, { images: false }), getSiteSettings()]);
  return (
    <>
      <SiteHeader viewer={viewer} brand={settings} />
      <main id="main" className="status-page">
        <div className="container-narrow">
          <p className="status-code num">404</p>
          <h1>We couldn’t find that page</h1>
          <p className="lead">It may have moved, the listing may no longer be available, or the address may be mistyped.</p>
          <div className="form-actions">
            <Link href="/properties" className="btn btn-lg">
              <Icon name="search" size={18} /> Browse properties
            </Link>
            <Link href="/" className="btn btn-lg btn-secondary">
              Return home
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter locations={locations} settings={settings} />
    </>
  );
}
