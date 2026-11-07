import Link from "next/link";
import { Icon } from "@/components/ui/icon";

/** Page numbers with ellipses: 1 … 4 5 6 … 12 */
export function pageWindow(page: number, totalPages: number): (number | "gap")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set([1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages));
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

type Props = { page: number; totalPages: number; label?: string } & ({ onPageChange: (page: number) => void; hrefFor?: never } | { hrefFor: (page: number) => string; onPageChange?: never });

export default function Pagination({ page, totalPages, label = "Pagination", onPageChange, hrefFor }: Props) {
  if (totalPages <= 1) return null;
  const item = (target: number, content: React.ReactNode, aria: string, disabled = false, current = false) =>
    hrefFor ? (
      disabled ? (
        <span className="is-disabled" aria-hidden="true">{content}</span>
      ) : (
        <Link href={hrefFor(target)} aria-label={aria} aria-current={current ? "page" : undefined}>
          {content}
        </Link>
      )
    ) : (
      <button type="button" onClick={() => onPageChange!(target)} disabled={disabled} aria-label={aria} aria-current={current ? "page" : undefined}>
        {content}
      </button>
    );

  return (
    <nav className="pagination" aria-label={label}>
      {item(page - 1, <Icon name="chevron-left" size={18} />, "Previous page", page <= 1)}
      <div className="pagination-pages">
        {pageWindow(page, totalPages).map((p, i) =>
          p === "gap" ? (
            <span key={`gap-${i}`} className="pagination-ellipsis" aria-hidden="true">
              …
            </span>
          ) : (
            <span key={p}>{item(p, p, `Page ${p}`, false, p === page)}</span>
          ),
        )}
      </div>
      {item(page + 1, <Icon name="chevron-right" size={18} />, "Next page", page >= totalPages)}
    </nav>
  );
}
