"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import EmptyState from "@/components/ui/empty-state";
import { submitJson } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { formatDate, formatRelative } from "@/lib/format";

export type NotificationRow = { id: string; type: string; title: string; body: string | null; href: string | null; readAt: string | null; createdAt: string };

const ICON: Record<string, string> = { submission: "clipboard", registration: "user-plus", agent_application: "briefcase", inquiry: "inbox", approval_request: "check-circle", system: "info" };

/** Full notification history with per-item and bulk mark-as-read. */
export default function NotificationList({ items, unread }: { items: NotificationRow[]; unread: number }) {
  const router = useRouter();
  const notify = useToast();
  async function mark(body: object) {
    try {
      const j = await submitJson("/api/admin/notifications", "PATCH", body);
      notify(j.message);
      router.refresh();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Update failed.", "error");
    }
  }
  if (!items.length) return <EmptyState icon="bell" title="No notifications yet" description="You’ll be notified about new submissions, registrations, agent applications and inquiries." />;
  return (
    <>
      <div className="table-toolbar-row notif-toolbar">
        <p className="table-count table-count-start">{unread} unread</p>
        {unread > 0 && (
          <button type="button" className="btn btn-secondary" onClick={() => mark({ all: true })}>
            <Icon name="check-all" size={16} /> Mark all as read
          </button>
        )}
      </div>
      <ul className="panel notif-history">
        {items.map((n) => (
          <li key={n.id} className={n.readAt ? "" : "is-unread"}>
            <span className="notif-icon">
              <Icon name={ICON[n.type] || "info"} size={16} />
            </span>
            <div className="notif-text">
              <span className="notif-title">{n.title}</span>
              {n.body && <span className="feed-sub">{n.body}</span>}
              <span className="notif-time" title={formatDate(n.createdAt, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}>
                {formatRelative(n.createdAt)}
              </span>
            </div>
            <div className="inline-actions">
              {n.href && (
                <Link href={n.href} className="btn btn-secondary btn-sm" onClick={() => !n.readAt && mark({ ids: [n.id] })}>
                  Open
                </Link>
              )}
              {!n.readAt && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => mark({ ids: [n.id] })}>
                  Mark read
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
