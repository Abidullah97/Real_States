"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { formatRelative } from "@/lib/format";

type Item = { id: string; type: string; title: string; body: string | null; href: string | null; readAt: string | null; createdAt: string };

const TYPE_ICON: Record<string, string> = {
  submission: "clipboard",
  registration: "user-plus",
  agent_application: "briefcase",
  inquiry: "inbox",
  approval_request: "check-circle",
  system: "info",
};

/** Header notification dropdown. Polls the API every minute; data comes only from real backend events. */
export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/notifications", { cache: "no-store" });
      if (!r.ok) throw new Error();
      const d = await r.json();
      setItems(d.items);
      setUnread(d.unread);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const timer = setInterval(load, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function mark(body: object) {
    await fetch("/api/admin/notifications", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
    await load();
  }

  async function openItem(item: Item) {
    setOpen(false);
    if (!item.readAt) await mark({ ids: [item.id] });
    if (item.href) router.push(item.href);
  }

  return (
    <div className="notif" ref={ref}>
      <button
        type="button"
        className="icon-btn notif-trigger"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        onClick={() => {
          setOpen((v) => !v);
          if (!open) load();
        }}
      >
        <Icon name="bell" size={20} />
        {unread > 0 && <span className="notif-count num">{unread > 99 ? "99+" : unread}</span>}
      </button>
      <div className={`menu-panel notif-panel ${open ? "is-open" : ""}`}>
        <div className="notif-head">
          <strong>Notifications</strong>
          {unread > 0 && (
            <button type="button" className="text-link" onClick={() => mark({ all: true })}>
              <Icon name="check-all" size={15} /> Mark all read
            </button>
          )}
        </div>
        {failed ? (
          <p className="notif-empty">Notifications couldn’t be loaded.</p>
        ) : items.length ? (
          <ul className="notif-list">
            {items.map((n) => (
              <li key={n.id}>
                <button type="button" className={`notif-item ${n.readAt ? "" : "is-unread"}`} onClick={() => openItem(n)}>
                  <span className="notif-icon">
                    <Icon name={TYPE_ICON[n.type] || "info"} size={16} />
                  </span>
                  <span className="notif-text">
                    <span className="notif-title">{n.title}</span>
                    {n.body && <span className="notif-body">{n.body}</span>}
                    <span className="notif-time">{formatRelative(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="notif-empty">You’re all caught up.</p>
        )}
        <Link href="/admin/notifications" className="notif-all" onClick={() => setOpen(false)}>
          View all notifications
        </Link>
      </div>
    </div>
  );
}
