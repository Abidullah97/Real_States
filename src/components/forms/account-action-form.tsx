"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Field, FormAlert, SubmitButton, submitJson, type FormMessage } from "@/components/ui/form";
import PasswordInput, { PASSWORD_RULES, PasswordChecklist } from "@/components/ui/password-input";

type Mode = "forgot" | "resend" | "verify" | "reset";

const ENDPOINT: Record<Mode, string> = { forgot: "forgot-password", resend: "resend-verification", verify: "verify-email", reset: "reset-password" };
const LABEL: Record<Mode, [string, string]> = {
  forgot: ["Send reset link", "Sending…"],
  resend: ["Send verification link", "Sending…"],
  verify: ["Verify email address", "Verifying…"],
  reset: ["Update password", "Updating…"],
};

export default function AccountActionForm({ mode, email = "", token = "" }: { mode: Mode; email?: string; token?: string }) {
  const [message, setMessage] = useState<FormMessage>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [password, setPassword] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const result = await submitJson(`/api/auth/${ENDPOINT[mode]}`, "POST", data);
      setMessage({ tone: "success", text: result.message });
      setDone(true);
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Could not complete this request." });
    } finally {
      setBusy(false);
    }
  }

  if ((mode === "verify" || mode === "reset") && (!email || !token))
    return (
      <div className="auth-form">
        <FormAlert message={{ tone: "error", text: "This link is incomplete or has been altered. Request a new one to continue." }} />
        <Link href={mode === "verify" ? "/resend-verification" : "/forgot-password"} className="btn btn-lg btn-block">
          Request a new link
        </Link>
      </div>
    );

  if (done)
    return (
      <div className="auth-form">
        <FormAlert message={message} />
        <Link href="/signin" className="btn btn-lg btn-block">
          Continue to sign in
        </Link>
      </div>
    );

  return (
    <form className="form auth-form" onSubmit={submit}>
      {mode === "forgot" || mode === "resend" ? (
        <Field label="Email address">
          <input className="input" name="email" type="email" autoComplete="email" defaultValue={email} maxLength={254} required placeholder="name@example.com" />
        </Field>
      ) : (
        <>
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="token" value={token} />
        </>
      )}
      {mode === "reset" && (
        <>
          <Field label="New password">
            <PasswordInput
              name="password"
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              required
              pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{12,}"
              title={`Use ${PASSWORD_RULES.map((r) => r.label.toLowerCase()).join(", ")}.`}
              onChange={(e) => setPassword(e.currentTarget.value)}
            />
          </Field>
          <PasswordChecklist value={password} />
        </>
      )}
      <FormAlert message={message} />
      <SubmitButton busy={busy} busyLabel={LABEL[mode][1]} className="btn-lg btn-block">
        {LABEL[mode][0]}
      </SubmitButton>
      <p className="auth-switch">
        Remembered your details? <Link href="/signin">Back to sign in</Link>
      </p>
    </form>
  );
}
