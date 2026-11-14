"use client";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { useConfirm, usePrompt } from "@/components/ui/confirm-dialog";
import { Field, FormAlert, SubmitButton, submitJson, type FormMessage } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { shrinkImage } from "@/lib/shrink-image";
import SlideOver from "@/components/ui/slide-over";
import { useToast } from "@/components/ui/toast";

export type AgentProfileData = {
  profileId: string;
  userId: string;
  name: string | null;
  email: string;
  image: string | null;
  phone: string | null;
  location: string | null;
  bio: string | null;
  experienceYears: number | null;
  specialization: string | null;
  verified: boolean;
  status: string;
  suspended: boolean;
};

/** Shared fields for creating an agent and editing an agent profile. */
function AgentFields({ agent, includeEmail }: { agent?: AgentProfileData; includeEmail?: boolean }) {
  return (
    <div className="form-grid">
      <Field label="Full name">
        <input className="input" name="name" required minLength={2} maxLength={100} defaultValue={agent?.name || ""} />
      </Field>
      {includeEmail && (
        <Field label="Email address" hint="A link to set a password is sent here.">
          <input className="input" name="email" type="email" required maxLength={254} />
        </Field>
      )}
      <Field label="Phone">
        <input className="input" name="phone" type="tel" required minLength={7} maxLength={30} defaultValue={agent?.phone || ""} />
      </Field>
      <Field label="Location" hint="City or areas covered, e.g. Lahore — DHA & Gulberg">
        <input className="input" name="location" required minLength={2} maxLength={120} defaultValue={agent?.location || ""} />
      </Field>
      <Field label="Years of experience" optional>
        <input className="input" name="experienceYears" type="number" min={0} max={70} defaultValue={agent?.experienceYears ?? ""} />
      </Field>
      <Field label="Specialization" optional hint="e.g. Luxury villas, Commercial rentals">
        <input className="input" name="specialization" maxLength={160} defaultValue={agent?.specialization || ""} />
      </Field>
      <Field label="Biography" optional className="span-full" hint="Shown on the public agent profile.">
        <textarea className="textarea" name="bio" maxLength={3000} rows={5} defaultValue={agent?.bio || ""} />
      </Field>
    </div>
  );
}

/** "Add agent" slide-over: creates a verified account and emails a set-password link. */
export function AddAgentButton({ startOpen = false }: { startOpen?: boolean }) {
  const router = useRouter();
  const notify = useToast();
  const [open, setOpen] = useState(startOpen);
  const [message, setMessage] = useState<FormMessage>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const d = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    try {
      const j = await submitJson("/api/admin/agents", "POST", { ...d, experienceYears: d.experienceYears || undefined, verified: d.verified === "on" });
      notify(j.message);
      setOpen(false);
      router.push(j.id ? `/admin/agents/${j.id}` : "/admin/agents");
      router.refresh();
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Agent could not be created." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="btn" onClick={() => setOpen(true)}>
        <Icon name="user-plus" size={17} /> Add agent
      </button>
      <SlideOver open={open} onClose={() => setOpen(false)} title="Add an agent" description="Creates an agent account. The agent sets their own password from the emailed link.">
        <form className="form" onSubmit={submit}>
          <AgentFields includeEmail />
          <label className="checkbox">
            <input type="checkbox" name="verified" />
            <span>
              Mark as verified
              <small>Only after you have confirmed their credentials. Shows a verified badge publicly.</small>
            </span>
          </label>
          <FormAlert message={message} />
          <div className="form-actions">
            <SubmitButton busy={busy} busyLabel="Creating…">
              Create agent
            </SubmitButton>
          </div>
        </form>
      </SlideOver>
    </>
  );
}

/** Actions and editing tools on an agent's profile page. */
export function AgentProfileActions({ agent, assignable }: { agent: AgentProfileData; assignable: { id: string; label: string }[] }) {
  const router = useRouter();
  const notify = useToast();
  const confirm = useConfirm();
  const prompt = usePrompt();
  const [panel, setPanel] = useState<"edit" | "assign" | null>(null);
  const [message, setMessage] = useState<FormMessage>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function call(url: string, method: string, body?: object | FormData) {
    setBusy(true);
    try {
      const r = await fetch(url, body instanceof FormData ? { method, body } : { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Request failed.");
      notify(j.message);
      router.refresh();
      return true;
    } catch (e) {
      notify(e instanceof Error ? e.message : "Request failed.", "error");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    if (await confirm({ title: `Approve ${agent.name || agent.email} as an agent?`, description: "They gain the Agent role, can be assigned listings and inquiries, and appear in the public directory.", confirmLabel: "Approve agent" })) call(`/api/admin/agents/${agent.profileId}`, "PATCH", { action: "approve" });
  }
  async function reject() {
    const reason = await prompt({ title: "Reject this application?", description: "The applicant can see the reason and apply again later.", confirmLabel: "Reject", tone: "danger", input: { label: "Reason", minLength: 5, multiline: true } });
    if (reason) call(`/api/admin/agents/${agent.profileId}`, "PATCH", { action: "reject", reason });
  }
  async function toggleActive() {
    if (!agent.suspended && !(await confirm({ title: `Deactivate ${agent.name || agent.email}?`, description: "They are signed out, hidden from the directory and can no longer be assigned listings.", confirmLabel: "Deactivate", tone: "danger" }))) return;
    call(`/api/admin/users/${agent.userId}`, "PATCH", { suspended: !agent.suspended });
  }

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const d = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    try {
      const j = await submitJson(`/api/admin/users/${agent.userId}`, "PATCH", { ...d, experienceYears: d.experienceYears === "" ? null : Number(d.experienceYears) });
      notify(j.message);
      setPanel(null);
      router.refresh();
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Profile could not be saved." });
    } finally {
      setBusy(false);
    }
  }

  async function assign(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const ids = new FormData(e.currentTarget).getAll("propertyIds").map(String);
    if (!ids.length) return;
    if (await call(`/api/admin/agents/${agent.profileId}`, "PATCH", { action: "assign", propertyIds: ids })) setPanel(null);
  }

  async function upload(file?: File) {
    if (!file) return;
    const data = new FormData();
    data.set("file", await shrinkImage(file, { maxDimension: 1200 }));
    call(`/api/admin/users/${agent.userId}/avatar`, "POST", data);
    if (fileRef.current) fileRef.current.value = "";
  }

  const approved = agent.status === "APPROVED";
  return (
    <>
      <div className="detail-actions-bar">
        {agent.status === "PENDING" && (
          <>
            <button type="button" className="btn" disabled={busy} onClick={approve}>
              <Icon name="check" size={16} /> Approve application
            </button>
            <button type="button" className="btn btn-danger-ghost" disabled={busy} onClick={reject}>
              Reject
            </button>
          </>
        )}
        {agent.status === "REJECTED" && (
          <button type="button" className="btn" disabled={busy} onClick={approve}>
            <Icon name="check" size={16} /> Approve now
          </button>
        )}
        <button type="button" className="btn btn-secondary" onClick={() => setPanel("edit")}>
          <Icon name="edit" size={16} /> Edit profile
        </button>
        {approved && (
          <>
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setPanel("assign")}>
              <Icon name="building" size={16} /> Assign listings
            </button>
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => call(`/api/admin/users/${agent.userId}`, "PATCH", { verified: !agent.verified })}>
              <Icon name="shield" size={16} /> {agent.verified ? "Remove verification" : "Mark verified"}
            </button>
            <button type="button" className={`btn ${agent.suspended ? "btn-secondary" : "btn-danger-ghost"}`} disabled={busy} onClick={toggleActive}>
              <Icon name={agent.suspended ? "user-check" : "user-x"} size={16} /> {agent.suspended ? "Activate" : "Deactivate"}
            </button>
          </>
        )}
        <label className="btn btn-secondary">
          <Icon name="upload" size={16} /> {agent.image ? "Change photo" : "Upload photo"}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="visually-hidden" onChange={(e) => upload(e.target.files?.[0])} />
        </label>
        {agent.image && (
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => call(`/api/admin/users/${agent.userId}/avatar`, "DELETE")}>
            Remove photo
          </button>
        )}
      </div>

      <SlideOver open={panel === "edit"} onClose={() => setPanel(null)} title="Edit agent profile">
        <form className="form" onSubmit={saveProfile}>
          <AgentFields agent={agent} />
          <FormAlert message={message} />
          <div className="form-actions">
            <SubmitButton busy={busy} busyLabel="Saving…">
              Save profile
            </SubmitButton>
          </div>
        </form>
      </SlideOver>

      <SlideOver open={panel === "assign"} onClose={() => setPanel(null)} title="Assign listings" description="The agent becomes the public contact for the selected listings.">
        {assignable.length ? (
          <form className="form" onSubmit={assign}>
            <fieldset className="assign-list">
              <legend className="field-label">Listings without an agent</legend>
              {assignable.map((p) => (
                <label key={p.id} className="checkbox">
                  <input type="checkbox" name="propertyIds" value={p.id} />
                  <span>{p.label}</span>
                </label>
              ))}
            </fieldset>
            <div className="form-actions">
              <SubmitButton busy={busy} busyLabel="Assigning…">
                Assign selected
              </SubmitButton>
            </div>
          </form>
        ) : (
          <p className="panel-empty">Every listing already has an agent.</p>
        )}
      </SlideOver>
    </>
  );
}

/** Small client button to unassign one listing from an agent. */
export function UnassignButton({ profileId, propertyId, title }: { profileId: string; propertyId: string; title: string }) {
  const router = useRouter();
  const notify = useToast();
  const confirm = useConfirm();
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={async () => {
        if (!(await confirm({ title: `Unassign “${title}”?`, description: "The listing stays published without an assigned agent.", confirmLabel: "Unassign" }))) return;
        try {
          const j = await submitJson(`/api/admin/agents/${profileId}`, "PATCH", { action: "unassign", propertyId });
          notify(j.message);
          router.refresh();
        } catch (e) {
          notify(e instanceof Error ? e.message : "Failed.", "error");
        }
      }}
    >
      Unassign
    </button>
  );
}
