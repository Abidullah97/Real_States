"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

/** Right-hand panel built on the native modal <dialog> (focus trap, Escape and inert background included). */
export default function SlideOver({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.body.style.overflow = "hidden";
    }
    if (!open && dialog.open) dialog.close();
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="slide-over"
      aria-labelledby="slide-over-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open && (
        <>
          <div className="slide-over-head">
            <div>
              <h2 id="slide-over-title">{title}</h2>
              {description && <p>{description}</p>}
            </div>
            <button type="button" className="icon-btn icon-btn-bordered" onClick={onClose} aria-label="Close panel">
              <Icon name="close" />
            </button>
          </div>
          <div className="slide-over-body">{children}</div>
        </>
      )}
    </dialog>
  );
}
