"use client";
import { Children, cloneElement, isValidElement, useEffect, useId, useRef, useState, type ReactElement, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function messageFor(el: Control, label: string) {
  const v = el.validity;
  const name = label.replace(/\s*\(.*\)$/, "");
  if (v.valueMissing) {
    if (el instanceof HTMLSelectElement) return `Select ${name.toLowerCase()}.`;
    if (el instanceof HTMLInputElement && el.type === "file") return "Choose at least one file.";
    return `${name} is required.`;
  }
  if (v.typeMismatch) return el.type === "email" ? "Enter a valid email address, like name@example.com." : "Enter a valid value.";
  if (v.tooShort && "minLength" in el) return `Use at least ${el.minLength} characters (${el.value.length} so far).`;
  if (v.tooLong && "maxLength" in el) return `Use ${el.maxLength} characters or fewer.`;
  if (v.rangeUnderflow && "min" in el) return `Enter ${Number(el.min).toLocaleString()} or more.`;
  if (v.rangeOverflow && "max" in el) return `Enter ${Number(el.max).toLocaleString()} or less.`;
  if (v.badInput || v.stepMismatch) return "Enter a valid number.";
  if (v.patternMismatch) return el.title || "Use the requested format.";
  return el.validationMessage;
}

const isControl = (t: EventTarget): t is Control =>
  t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement;

/**
 * Labelled form field with inline validation. It uses the browser's constraint validation
 * (required, minLength, type="email"…) but renders the messages inline instead of browser bubbles.
 */
export function Field({
  label,
  hint,
  optional,
  children,
  className = "",
}: {
  label: string;
  hint?: ReactNode;
  optional?: boolean;
  children: ReactElement;
  className?: string;
}) {
  const autoId = useId();
  const [error, setError] = useState("");
  const child = Children.only(children);
  const props = (isValidElement(child) ? child.props : {}) as { id?: string; required?: boolean };
  const id = props.id || autoId;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : "", error ? errorId : ""].filter(Boolean).join(" ") || undefined;

  const check = (el: Control) => setError(el.validity.valid ? "" : messageFor(el, label));
  const wrapperRef = useRef<HTMLDivElement>(null);

  // "invalid" does not bubble, so listen in the capture phase on the wrapper.
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    function onInvalid(e: Event) {
      if (!e.target || !isControl(e.target)) return;
      e.preventDefault();
      setError(messageFor(e.target, label));
      const first = e.target.form?.querySelector<Control>("input:invalid, select:invalid, textarea:invalid");
      if (first === e.target) e.target.focus();
    }
    wrapper.addEventListener("invalid", onInvalid, true);
    return () => wrapper.removeEventListener("invalid", onInvalid, true);
  }, [label]);

  return (
    <div
      ref={wrapperRef}
      className={`field ${className}`}
      onBlurCapture={(e) => {
        if (isControl(e.target) && (e.target.value !== "" || error)) check(e.target);
      }}
      onChangeCapture={(e) => {
        if (error && isControl(e.target)) check(e.target);
      }}
    >
      <label className="field-label" htmlFor={id}>
        {label}
        {props.required && (
          <span className="field-required" aria-hidden="true">
            *
          </span>
        )}
        {optional && <span className="field-optional">(optional)</span>}
      </label>
      {cloneElement(child as ReactElement<Record<string, unknown>>, {
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })}
      {hint && (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="field-error">
          <Icon name="alert" size={14} />
          {error}
        </p>
      )}
    </div>
  );
}

export type FormMessage = { tone: "success" | "error" | "info"; text: string } | null;

export function FormAlert({ message, className = "" }: { message: FormMessage; className?: string }) {
  if (!message) return null;
  return (
    <div className={`alert alert-${message.tone} ${className}`} role={message.tone === "error" ? "alert" : "status"}>
      <Icon name={message.tone === "success" ? "check-circle" : message.tone === "error" ? "alert" : "info"} size={18} />
      <span>{message.text}</span>
    </div>
  );
}

export function SubmitButton({
  busy,
  busyLabel,
  children,
  className = "",
  disabled,
}: {
  busy: boolean;
  busyLabel: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button type="submit" className={`btn ${className}`} disabled={busy || disabled} aria-busy={busy || undefined}>
      {busy ? (
        <>
          <span className="spinner" aria-hidden="true" />
          {busyLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}

/** Shared helper for JSON form submissions that return `{message}` or `{error}`. */
export async function submitJson(url: string, method: string, body: unknown) {
  const response = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}
