"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import NotificationBell from "@/components/dashboard/notification-bell";
import AccountMenu from "@/components/site/account-menu";
import BrandLogo, { BrandMark } from "@/components/ui/brand-logo";
import { Icon } from "@/components/ui/icon";
import { useDrawer } from "@/components/ui/use-drawer";

export type NavItem = { label: string; href: string; icon: string; count?: number; exact?: boolean };
export type NavGroup = { title?: string; items: NavItem[] };

// Collapsed-sidebar preference is a per-browser convenience kept in localStorage.
const COLLAPSE_KEY = "eh:sidebar-collapsed";
const collapseListeners = new Set<() => void>();
const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
};
const subscribeCollapsed = (cb: () => void) => {
  collapseListeners.add(cb);
  return () => collapseListeners.delete(cb);
};
const setCollapsedPref = (value: boolean) => {
  try {
    localStorage.setItem(COLLAPSE_KEY, value ? "1" : "0");
  } catch {}
  collapseListeners.forEach((cb) => cb());
};

function SidebarNav({ groups, area, collapsed, onNavigate }: { groups: NavGroup[]; area: string; collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      <div className="dash-brand">
        {collapsed ? (
          <Link href="/" className="brand" aria-label="Estate House home">
            <BrandMark />
          </Link>
        ) : (
          <>
            <BrandLogo href="/" />
            <span className="dash-area">{area}</span>
          </>
        )}
      </div>
      <nav className="dash-nav" aria-label={`${area} navigation`}>
        {groups.map((group, i) => (
          <div key={group.title || i} className="dash-nav-group">
            {group.title && <p className="dash-nav-title">{group.title}</p>}
            <ul>
              {group.items.map((item) => {
                const base = item.href.split(/[#?]/)[0];
                const active = !item.href.includes("#") && (item.exact ? pathname === base : pathname === base || pathname.startsWith(`${base}/`));
                return (
                  <li key={item.href}>
                    <Link href={item.href} aria-current={active ? "page" : undefined} onClick={onNavigate} title={collapsed ? item.label : undefined}>
                      <Icon name={item.icon} size={19} />
                      <span className="dash-nav-label">{item.label}</span>
                      {!!item.count && (
                        <span className="dash-nav-count num" aria-label={`${item.count} need attention`}>
                          {item.count > 99 ? "99+" : item.count}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </>
  );
}

export default function DashboardShell({
  groups,
  area,
  user,
  searchAction,
  searchPlaceholder,
  tone = "light",
  notifications = false,
  children,
}: {
  groups: NavGroup[];
  area: string;
  user: { name: string | null; email: string; role: string };
  searchAction?: string;
  searchPlaceholder?: string;
  tone?: "light" | "dark";
  notifications?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDrawer(open, panelRef, close);
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);

  return (
    <div className={`dash dash-${tone} ${collapsed ? "is-collapsed" : ""}`}>
      <aside className="dash-sidebar">
        <SidebarNav groups={groups} area={area} collapsed={collapsed} />
        <button type="button" className="dash-collapse" onClick={() => setCollapsedPref(!collapsed)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-pressed={collapsed}>
          <Icon name={collapsed ? "panel-open" : "panel-close"} size={18} />
          <span className="dash-nav-label">Collapse</span>
        </button>
      </aside>

      <div className={`drawer-backdrop dash-backdrop ${open ? "is-open" : ""}`} onClick={close} aria-hidden="true" />
      <aside ref={panelRef} className={`dash-sidebar dash-sidebar-mobile ${open ? "is-open" : ""}`} role="dialog" aria-modal="true" aria-label="Dashboard menu">
        <button type="button" className="icon-btn icon-btn-bordered dash-close" onClick={close} aria-label="Close menu" data-autofocus>
          <Icon name="close" />
        </button>
        <SidebarNav groups={groups} area={area} onNavigate={close} />
      </aside>

      <div className="dash-main">
        <header className="dash-topbar">
          <button type="button" className="icon-btn dash-menu" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}>
            <Icon name="menu" size={22} />
          </button>
          {searchAction ? (
            <form action={searchAction} className="dash-search" role="search">
              <label htmlFor="dash-search" className="visually-hidden">
                {searchPlaceholder}
              </label>
              <Icon name="search" size={18} />
              <input id="dash-search" name="q" type="search" placeholder={searchPlaceholder} maxLength={100} />
            </form>
          ) : (
            <span className="dash-topbar-spacer" />
          )}
          <div className="dash-topbar-actions">
            <Link href="/" className="btn btn-ghost btn-sm dash-site-link">
              <Icon name="external" size={16} /> View site
            </Link>
            {notifications && <NotificationBell />}
            <AccountMenu {...user} />
          </div>
        </header>
        <main id="main" className="dash-content">
          {children}
        </main>
      </div>
    </div>
  );
}
