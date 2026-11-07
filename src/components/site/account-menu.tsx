"use client";
import { isAdminRole } from "@/lib/roles";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOutAction } from "@/app/actions";
import { Icon } from "@/components/ui/icon";
import { initials } from "@/lib/format";

/** Compact account dropdown with keyboard and outside-click dismissal. */
export default function AccountMenu({ name, email, role }: { name: string | null; email: string; role: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="account-menu" ref={ref}>
      <button
        ref={buttonRef}
        type="button"
        className="account-trigger"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="account-menu-panel"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="avatar" aria-hidden="true">
          {initials(name || email)}
        </span>
        <span className="visually-hidden">Account menu for {name || email}</span>
        <Icon name="chevron-down" size={16} />
      </button>
      <div id="account-menu-panel" className={`menu-panel ${open ? "is-open" : ""}`}>
        <div className="menu-identity">
          <strong>{name || "Your account"}</strong>
          <span>{email}</span>
        </div>
        <Link href="/dashboard" className="menu-item" onClick={() => setOpen(false)}>
          <Icon name="dashboard" size={17} /> Dashboard
        </Link>
        <Link href="/dashboard#saved" className="menu-item" onClick={() => setOpen(false)}>
          <Icon name="heart" size={17} /> Saved homes
        </Link>
        <Link href="/dashboard/listings" className="menu-item" onClick={() => setOpen(false)}>
          <Icon name="building" size={17} /> My listings
        </Link>
        {isAdminRole(role) && (
          <Link href="/admin" className="menu-item" onClick={() => setOpen(false)}>
            <Icon name="shield" size={17} /> Administration
          </Link>
        )}
        <form action={signOutAction} className="menu-divider">
          <button type="submit" className="menu-item">
            <Icon name="logout" size={17} /> Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
