"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Field, FormAlert, SubmitButton, submitJson, type FormMessage } from "@/components/ui/form";

/** Lets a signed-in member apply to become an agent. An administrator reviews every application. */
export default function AgentApplicationForm() {
  const router = useRouter();
  const [message, setMessage] = useState<FormMessage>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const j = await submitJson("/api/agent-application", "POST", Object.fromEntries(new FormData(e.currentTarget).entries()));
      setMessage({ tone: "success", text: j.message });
      router.refresh();
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Your application could not be submitted." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="form-grid">
        <Field label="Phone">
          <input className="input" name="phone" type="tel" required minLength={7} maxLength={30} autoComplete="tel" />
        </Field>
        <Field label="Location" hint="City or areas you cover">
          <input className="input" name="location" required minLength={2} maxLength={120} />
        </Field>
        <Field label="Years of experience">
          <input className="input" name="experienceYears" type="number" required min={0} max={70} />
        </Field>
        <Field label="Specialization" hint="e.g. Family homes, Commercial rentals">
          <input className="input" name="specialization" required minLength={2} maxLength={160} />
        </Field>
        <Field label="About you" className="span-full" hint="At least 30 characters. Shown on your public profile once approved.">
          <textarea className="textarea" name="bio" required minLength={30} maxLength={3000} rows={4} />
        </Field>
      </div>
      <FormAlert message={message} />
      <div className="form-actions">
        <SubmitButton busy={busy} busyLabel="Submitting…">
          Submit application
        </SubmitButton>
      </div>
    </form>
  );
}
