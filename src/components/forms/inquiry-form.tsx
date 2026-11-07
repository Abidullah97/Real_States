"use client";
import { useState, type FormEvent } from "react";
import { Field, FormAlert, SubmitButton, submitJson, type FormMessage } from "@/components/ui/form";

export default function InquiryForm({ propertySlug, defaultMessage, submitLabel = "Send enquiry" }: { propertySlug?: string; defaultMessage?: string; submitLabel?: string }) {
  const [message, setMessage] = useState<FormMessage>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const json = await submitJson("/api/inquiries", "POST", { ...data, propertySlug });
      setMessage({ tone: "success", text: json.message });
      setSent(true);
      form.reset();
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Something went wrong. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  if (sent)
    return (
      <div className="inquiry-sent">
        <FormAlert message={message} />
        <button type="button" className="btn btn-secondary btn-block" onClick={() => { setSent(false); setMessage(null); }}>
          Send another message
        </button>
      </div>
    );

  return (
    <form className="form inquiry-form" onSubmit={submit}>
      <Field label="Full name">
        <input className="input" name="name" required minLength={2} maxLength={100} autoComplete="name" placeholder="Your name" />
      </Field>
      <Field label="Email address">
        <input className="input" name="email" type="email" required maxLength={254} autoComplete="email" placeholder="name@example.com" />
      </Field>
      <Field label="Phone" optional>
        <input className="input" name="phone" type="tel" maxLength={30} autoComplete="tel" placeholder="+92 300 0000000" />
      </Field>
      <Field label="Message">
        <textarea
          className="textarea"
          name="message"
          required
          minLength={10}
          maxLength={2000}
          rows={4}
          defaultValue={defaultMessage ?? (propertySlug ? "I’d like to know more about this property and arrange a viewing." : "")}
        />
      </Field>
      <div className="honeypot" aria-hidden="true">
        <label>
          Leave empty
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <FormAlert message={message} />
      <SubmitButton busy={busy} busyLabel="Sending…" className="btn-lg btn-block">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
