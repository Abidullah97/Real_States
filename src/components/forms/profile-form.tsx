"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Field, FormAlert, SubmitButton, submitJson, type FormMessage } from "@/components/ui/form";
import PasswordInput, { PASSWORD_RULES, PasswordChecklist } from "@/components/ui/password-input";

export default function ProfileForm({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<FormMessage>(null);
  const [busy, setBusy] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const form = e.currentTarget;
    const d = Object.fromEntries(new FormData(form).entries());
    try {
      const j = await submitJson("/api/profile", "PATCH", { name: d.name, currentPassword: d.currentPassword || undefined, newPassword: d.newPassword || undefined });
      setMessage({ tone: "success", text: j.message });
      (form.elements.namedItem("currentPassword") as HTMLInputElement).value = "";
      (form.elements.namedItem("newPassword") as HTMLInputElement).value = "";
      setNewPassword("");
      router.refresh();
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Could not update your profile." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form profile-form" onSubmit={submit}>
      <div className="form-grid">
        <Field label="Display name">
          <input className="input" name="name" defaultValue={name} minLength={2} maxLength={100} required autoComplete="name" />
        </Field>
        <Field label="Email address" hint="Contact support to change your sign-in email.">
          <input className="input" value={email} disabled readOnly />
        </Field>
      </div>
      <section className="form-section">
        <h3 className="form-section-title">Change password</h3>
        <p>Leave both fields blank to keep your current password.</p>
        <div className="form-grid">
          <Field label="Current password" optional>
            <PasswordInput name="currentPassword" minLength={8} maxLength={128} autoComplete="current-password" required={!!newPassword} />
          </Field>
          <Field label="New password" optional>
            <PasswordInput
              name="newPassword"
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{12,}"
              title={`Use ${PASSWORD_RULES.map((r) => r.label.toLowerCase()).join(", ")}.`}
              onChange={(e) => setNewPassword(e.currentTarget.value)}
            />
          </Field>
        </div>
        {newPassword && <PasswordChecklist value={newPassword} />}
      </section>
      <FormAlert message={message} />
      <div className="form-actions">
        <SubmitButton busy={busy} busyLabel="Saving…">
          Save changes
        </SubmitButton>
      </div>
    </form>
  );
}
