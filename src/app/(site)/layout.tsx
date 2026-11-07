import SiteHeader from "@/components/site/site-header";
import SiteFooter from "@/components/site/site-footer";
import { FavoritesProvider } from "@/components/property/favorites-provider";
import { ToastProvider } from "@/components/ui/toast";
import { getViewer } from "@/lib/authorization";
import { getLocationSummaries } from "@/lib/property-data";
import { getSiteSettings } from "@/lib/site-content";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [viewer, locations, settings] = await Promise.all([getViewer(), getLocationSummaries(5, { images: false }), getSiteSettings()]);
  return (
    <ToastProvider>
      <FavoritesProvider signedIn={!!viewer}>
        <SiteHeader viewer={viewer} brand={settings} />
        <main id="main" className="site-main">
          {children}
        </main>
        <SiteFooter locations={locations} settings={settings} />
      </FavoritesProvider>
    </ToastProvider>
  );
}
