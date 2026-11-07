"use client";
import { useState, type InputHTMLAttributes } from "react";
import { Icon } from "@/components/ui/icon";

/** Password input with an accessible show/hide toggle. Extra props (id, aria-*) pass through to the input. */
export default function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-input">
      <input {...props} type={visible ? "text" : "password"} className="input" />
      <button type="button" className="password-toggle" onClick={() => setVisible((v) => !v)} aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible}>
        <Icon name={visible ? "eye-off" : "eye"} size={18} />
      </button>
    </div>
  );
}

export const PASSWORD_RULES = [
  { label: "At least 12 characters", test: (v: string) => v.length >= 12 },
  { label: "An upper case letter", test: (v: string) => /[A-Z]/.test(v) },
  { label: "A lower case letter", test: (v: string) => /[a-z]/.test(v) },
  { label: "A number", test: (v: string) => /[0-9]/.test(v) },
];

export function PasswordChecklist({ value }: { value: string }) {
  return (
    <ul className="password-rules" aria-label="Password requirements">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(value);
        return (
          <li key={rule.label} className={ok ? "is-met" : ""}>
            <Icon name={ok ? "check-circle" : "info"} size={15} />
            {rule.label}
            <span className="visually-hidden">{ok ? " (met)" : " (not yet met)"}</span>
          </li>
        );
      })}
    </ul>
  );
}
