"use client";
import { isAdminRole } from "@/lib/roles";
import Link from "next/link";
import { Suspense, useCallback, useRef, useState } from "react";
import { signOutAction } from "@/app/actions";
import BrandLogo from "@/components/ui/brand-logo";
import { Icon } from "@/components/ui/icon";
import { useDrawer } from "@/components/ui/use-drawer";
import NavLinks, { StaticNavLinks } from "@/components/site/nav-links";

type Viewer = { name: string | null; email: string; role: string } | null;

export default function MobileNavigation({ viewer }: { viewer: Viewer }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDrawer(open, panelRef, close);

  return (
    <>
      <button
        type="button"
        className="icon-btn mobile-nav-trigger"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-navigation"
        onClick={() => setOpen(true)}
      >
        <Icon name="menu" size={22} />
      </button>
      <div className={`drawer-backdrop ${open ? "is-open" : ""}`} onClick={close} aria-hidden="true" />
      <div
        ref={panelRef}
        id="mobile-navigation"
        className={`mobile-nav ${open ? "is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
      >
        <div className="mobile-nav-head">
          <BrandLogo />
          <button type="button" className="icon-btn icon-btn-bordered" onClick={close} aria-label="Close menu" data-autofocus>
            <Icon name="close" />
          </button>
        </div>
        <nav aria-label="Mobile">
          <Suspense fallback={<StaticNavLinks className="mobile-nav-links" />}>
            <NavLinks className="mobile-nav-links" onNavigate={close} />
          </Suspense>
        </nav>
        <div className="mobile-nav-account">
          {viewer ? (
            <>
              <p className="eyebrow">Signed in as {viewer.name || viewer.email}</p>
              <Link href="/dashboard" onClick={close}>
                <Icon name="dashboard" size={18} /> Dashboard
              </Link>
              <Link href="/dashboard#saved" onClick={close}>
                <Icon name="heart" size={18} /> Saved homes
              </Link>
              {isAdminRole(viewer.role) && (
                <Link href="/admin" onClick={close}>
                  <Icon name="shield" size={18} /> Administration
                </Link>
              )}
              <form action={signOutAction}>
                <button type="submit">
                  <Icon name="logout" size={18} /> Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/signin" onClick={close}>
                <Icon name="user" size={18} /> Sign in
              </Link>
              <Link href="/signup" onClick={close}>
                <Icon name="plus" size={18} /> Create an account
              </Link>
            </>
          )}
        </div>
        <Link href="/sell" className="btn btn-lg btn-block" onClick={close}>
          List a property
        </Link>
      </div>
    </>
  );
}
