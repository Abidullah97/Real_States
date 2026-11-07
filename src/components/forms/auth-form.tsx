"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState, type FormEvent } from "react";
import { Field, FormAlert, SubmitButton, submitJson, type FormMessage } from "@/components/ui/form";
import PasswordInput, { PASSWORD_RULES, PasswordChecklist } from "@/components/ui/password-input";

const PASSWORD_PATTERN = "(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{12,}";

export default function AuthForm({ mode, callbackUrl = "/dashboard" }: { mode: "signin" | "signup"; callbackUrl?: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<FormMessage>(null);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [created, setCreated] = useState(false);
  const signup = mode === "signup";

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      if (signup) {
        const json = await submitJson("/api/register", "POST", data);
        setMessage({ tone: "success", text: json.message });
        setCreated(true);
      } else {
        const result = await signIn("credentials", { email: data.email, password: data.password, redirect: false, callbackUrl });
        if (result?.error) throw new Error("That email and password combination wasn’t recognised, or the email address hasn’t been verified yet.");
        setMessage({ tone: "success", text: "Signed in. Taking you to your account…" });
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Could not complete that request." });
    } finally {
      setBusy(false);
    }
  }

  if (created)
    return (
      <div className="auth-form">
        <FormAlert message={message} />
        <p className="form-note">Didn’t receive it? Check your spam folder or <Link href="/resend-verification" className="text-link">request a new link</Link>.</p>
        <Link href="/signin" className="btn btn-lg btn-block">
          Continue to sign in
        </Link>
      </div>
    );

  return (
    <form className="form auth-form" onSubmit={submit}>
      {signup && (
        <Field label="Full name">
          <input className="input" name="name" minLength={2} maxLength={100} autoComplete="name" required />
        </Field>
      )}
      <Field label="Email address">
        <input className="input" name="email" type="email" maxLength={254} autoComplete="email" required placeholder="name@example.com" />
      </Field>
      <div className="auth-password">
        <Field label="Password">
          <PasswordInput
            name="password"
            required
            minLength={signup ? 12 : 8}
            maxLength={128}
            autoComplete={signup ? "new-password" : "current-password"}
            pattern={signup ? PASSWORD_PATTERN : undefined}
            title={signup ? `Use ${PASSWORD_RULES.map((r) => r.label.toLowerCase()).join(", ")}.` : undefined}
            onChange={(e) => setPassword(e.currentTarget.value)}
          />
        </Field>
        {!signup && (
          <Link href="/forgot-password" className="auth-forgot">
            Forgot password?
          </Link>
        )}
      </div>
      {signup && <PasswordChecklist value={password} />}
      <FormAlert message={message} />
      <SubmitButton busy={busy} busyLabel={signup ? "Creating account…" : "Signing in…"} className="btn-lg btn-block">
        {signup ? "Create account" : "Sign in"}
      </SubmitButton>
      <p className="auth-switch">
        {signup ? "Already have an account?" : "New to Estate House?"}{" "}
        <Link href={signup ? "/signin" : "/signup"}>{signup ? "Sign in" : "Create an account"}</Link>
      </p>
      {!signup && (
        <p className="auth-switch auth-switch-muted">
          Haven’t verified your email? <Link href="/resend-verification">Resend the link</Link>
        </p>
      )}
    </form>
  );
}
