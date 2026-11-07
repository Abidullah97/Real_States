import Link from "next/link";
import type { ReactNode } from "react";
import Breadcrumbs, { type Crumb } from "@/components/ui/breadcrumbs";
import { Icon } from "@/components/ui/icon";

export function DashboardPageHeader({ title, description, breadcrumbs, actions }: { title: string; description?: ReactNode; breadcrumbs?: Crumb[]; actions?: ReactNode }) {
  return (
    <header className="dash-page-head">
      <div>
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="dash-page-actions">{actions}</div>}
    </header>
  );
}

export function StatCard({ label, value, icon, hint, href }: { label: string; value: number | string; icon: string; hint?: ReactNode; href?: string }) {
  const body = (
    <>
      <div className="stat-card-top">
        <span>{label}</span>
        <span className="stat-card-icon">
          <Icon name={icon} size={18} />
        </span>
      </div>
      <p className="stat-card-value num">{typeof value === "number" ? value.toLocaleString("en-US") : value}</p>
      {hint && <p className="stat-card-hint">{hint}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="stat-card stat-card-link">
      {body}
    </Link>
  ) : (
    <div className="stat-card">{body}</div>
  );
}

export function Panel({ title, action, children, className = "", id }: { title: string; action?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section className={`panel ${className}`} aria-labelledby={id ? `${id}-title` : undefined} id={id}>
      <div className="panel-head">
        <h2 id={id ? `${id}-title` : undefined}>{title}</h2>
        {action}
      </div>
      <div className="panel-body">{children}</div>
    </section>
  );
}

export type Column<T> = { key: string; header: string; cell: (row: T) => ReactNode; className?: string; hideOnMobile?: boolean };

/**
 * Accessible table that turns into stacked cards on small screens. Each cell carries its
 * header as a data-label so mobile cards stay readable.
 */
export function DataTable<T>({ columns, rows, rowKey, caption, empty }: { columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string; caption: string; empty?: ReactNode }) {
  if (!rows.length) return <>{empty}</>;
  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={c.className}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((c) => (
                <td key={c.key} data-label={c.header} className={`${c.className || ""} ${c.hideOnMobile ? "hide-mobile" : ""}`}>
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
