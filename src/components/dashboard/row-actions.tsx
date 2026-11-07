"use client";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Icon } from "@/components/ui/icon";

export type RowAction = { label: string; icon: string; onSelect: () => void; tone?: "danger"; href?: string };

const MENU_WIDTH = 220;

/**
 * Overflow menu for contextual table-row actions. The panel is fixed-positioned against its
 * trigger so it is never clipped by a scrolling table container, and flips upward near the
 * bottom of the viewport.
 */
export default function RowActions({ actions, label }: { actions: RowAction[]; label: string }) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({});
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current || !panelRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const height = panelRef.current.offsetHeight;
    const below = window.innerHeight - rect.bottom;
    const top = below < height + 12 && rect.top > height + 12 ? rect.top - height - 6 : rect.bottom + 6;
    const left = Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8));
    // Measure layout before paint so the panel never flashes in the wrong place.
    setStyle({ position: "fixed", top, left, right: "auto", width: MENU_WIDTH });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    // preventScroll: a scroll here would immediately trigger the close-on-scroll listener.
    panelRef.current?.querySelector<HTMLElement>(".menu-item")?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  if (!actions.length) return null;
  return (
    <div className="row-actions" ref={ref}>
      <button ref={buttonRef} type="button" className="icon-btn" aria-haspopup="true" aria-expanded={open} aria-label={`More actions for ${label}`} onClick={() => setOpen((v) => !v)}>
        <Icon name="more" size={20} />
      </button>
      <div ref={panelRef} className={`menu-panel row-actions-panel ${open ? "is-open" : ""}`} style={open ? style : undefined}>
        {actions.map((a) =>
          a.href ? (
            <a key={a.label} href={a.href} target="_blank" rel="noreferrer" className="menu-item" onClick={() => setOpen(false)}>
              <Icon name={a.icon} size={17} /> {a.label}
            </a>
          ) : (
            <button
              key={a.label}
              type="button"
              className={`menu-item ${a.tone === "danger" ? "menu-item-danger" : ""}`}
              onClick={() => {
                setOpen(false);
                a.onSelect();
              }}
            >
              <Icon name={a.icon} size={17} /> {a.label}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
