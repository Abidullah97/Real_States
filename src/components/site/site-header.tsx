import Link from "next/link";
import { Suspense } from "react";
import BrandLogo, { type Branding } from "@/components/ui/brand-logo";
import { Icon } from "@/components/ui/icon";
import NavLinks, { StaticNavLinks } from "@/components/site/nav-links";
import AccountMenu from "@/components/site/account-menu";
import MobileNavigation from "@/components/site/mobile-navigation";
import type { Principal } from "@/lib/authorization";

export default function SiteHeader({ viewer, brand }: { viewer: Principal | null; brand?: Branding }) {
  const account = viewer ? { name: viewer.name, email: viewer.email, role: viewer.role } : null;
  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <BrandLogo brand={brand} />
        <nav aria-label="Main" className="site-nav">
          <Suspense fallback={<StaticNavLinks />}>
            <NavLinks />
          </Suspense>
        </nav>
        <div className="site-header-actions">
          {viewer ? (
            <>
              <Link href="/dashboard#saved" className="icon-btn header-saved" aria-label="Saved homes" title="Saved homes">
                <Icon name="heart" size={20} />
              </Link>
              <AccountMenu {...account!} />
            </>
          ) : (
            <Link href="/signin" className="header-signin">
              Sign in
            </Link>
          )}
          <Link href="/sell" className="btn btn-sm header-cta">
            List a property
          </Link>
          <MobileNavigation viewer={account} />
        </div>
      </div>
    </header>
  );
}
