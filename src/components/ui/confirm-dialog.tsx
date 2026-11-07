"use client";
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  /** When set, the dialog asks for text (e.g. a rejection reason) and resolves with it. */
  input?: { label: string; placeholder?: string; minLength?: number; multiline?: boolean };
};

type Pending = ConfirmOptions & { resolve: (value: string | boolean) => void };
type Ask = (options: ConfirmOptions) => Promise<string | boolean>;

const ConfirmContext = createContext<Ask | null>(null);

/** Promise-based, accessible confirmation dialog for important or destructive actions. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputId = useId();

  const ask = useCallback<Ask>((options) => {
    setValue("");
    setError("");
    return new Promise((resolve) => setPending({ ...options, resolve }));
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (pending && dialog && !dialog.open) dialog.showModal();
  }, [pending]);

  function close(result: boolean) {
    if (result && pending?.input) {
      const min = pending.input.minLength ?? 1;
      if (value.trim().length < min) {
        setError(`Enter at least ${min} characters.`);
        return;
      }
      pending.resolve(value.trim());
    } else pending?.resolve(result);
    dialogRef.current?.close();
    setPending(null);
  }

  const danger = pending?.tone === "danger";
  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      <dialog
        ref={dialogRef}
        className="dialog"
        aria-labelledby="confirm-title"
        aria-describedby={pending?.description ? "confirm-description" : undefined}
        onCancel={(e) => {
          e.preventDefault();
          close(false);
        }}
      >
        {pending && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              close(true);
            }}
          >
            <div className="dialog-body">
              <span className={`dialog-icon ${danger ? "dialog-icon-danger" : ""}`}>
                <Icon name={danger ? "alert" : "info"} size={22} />
              </span>
              <h2 id="confirm-title">{pending.title}</h2>
              {pending.description && <p id="confirm-description">{pending.description}</p>}
              {pending.input && (
                <div className="field">
                  <label className="field-label" htmlFor={inputId}>
                    {pending.input.label}
                    <span className="field-required" aria-hidden="true">
                      *
                    </span>
                  </label>
                  {pending.input.multiline ? (
                    <textarea id={inputId} className="textarea" rows={4} value={value} onChange={(e) => setValue(e.target.value)} placeholder={pending.input.placeholder} aria-invalid={error ? true : undefined} autoFocus maxLength={500} />
                  ) : (
                    <input id={inputId} className="input" value={value} onChange={(e) => setValue(e.target.value)} placeholder={pending.input.placeholder} aria-invalid={error ? true : undefined} autoFocus maxLength={200} />
                  )}
                  {error && (
                    <p className="field-error" role="alert">
                      <Icon name="alert" size={14} /> {error}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="dialog-footer">
              <button type="button" className="btn btn-secondary" onClick={() => close(false)} autoFocus={!pending.input}>
                {pending.cancelLabel || "Cancel"}
              </button>
              <button type="submit" className={`btn ${danger ? "btn-danger" : ""}`}>
                {pending.confirmLabel || "Confirm"}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </ConfirmContext.Provider>
  );
}

/** Yes/no confirmation. */
export function useConfirm(): (options: ConfirmOptions) => Promise<boolean> {
  const ask = useContext(ConfirmContext);
  return async (o) => (ask ? (await ask({ ...o, input: undefined })) !== false : window.confirm(o.description ? `${o.title}\n\n${o.description}` : o.title));
}

/** Confirmation that collects text; resolves with the text, or null when cancelled. */
export function usePrompt(): (options: ConfirmOptions & { input: NonNullable<ConfirmOptions["input"]> }) => Promise<string | null> {
  const ask = useContext(ConfirmContext);
  return async (o) => {
    if (!ask) return window.prompt(o.title);
    const result = await ask(o);
    return typeof result === "string" ? result : null;
  };
}
