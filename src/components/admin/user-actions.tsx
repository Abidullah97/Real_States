"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Field, FormAlert, SubmitButton, submitJson, type FormMessage } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import SlideOver from "@/components/ui/slide-over";
import { useToast } from "@/components/ui/toast";
import { ROLE_LABELS, type Role } from "@/lib/roles";

export type UserSummary = { id: string; name: string | null; email: string; role: Role; suspended: boolean };

/** Server-enforced rules are mirrored here only to avoid offering actions that would be refused. */
export function useUserActions(viewerId: string) {
  const router = useRouter();
  const confirm = useConfirm();
  const notify = useToast();

  async function patch(user: UserSummary, body: object) {
    try {
      const j = await submitJson(`/api/admin/users/${user.id}`, "PATCH", body);
      notify(j.message);
      router.refresh();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Update failed.", "error");
    }
  }

  async function suspend(user: UserSummary) {
    if (await confirm({ title: `Suspend ${user.name || user.email}?`, description: "They are signed out immediately and cannot sign in until reactivated. Their listings and inquiries are kept.", confirmLabel: "Suspend account", tone: "danger" })) patch(user, { suspended: true });
  }
  const activate = (user: UserSummary) => patch(user, { suspended: false });

  async function remove(user: UserSummary, after?: () => void) {
    const ok = await confirm({
      title: `Delete ${user.name || user.email}?`,
      description: "The account, saved homes and sessions are deleted. Listings they owned or managed are kept without an owner. This cannot be undone — consider suspending instead.",
      confirmLabel: "Delete account",
      tone: "danger",
    });
    if (!ok) return;
    try {
      const r = await fetch(`/api/admin/users/${user.id}?confirm=delete`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      notify(j.message);
      if (after) after();
      else router.refresh();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Delete failed.", "error");
    }
  }

  const isSelf = (user: UserSummary) => user.id === viewerId;
  return { patch, suspend, activate, remove, isSelf };
}

export function UserEditForm({ user, roles, isSelf, onSaved }: { user: UserSummary; roles: Role[]; isSelf: boolean; onSaved: (m: string) => void }) {
  const confirm = useConfirm();
  const [message, setMessage] = useState<FormMessage>(null);
  const [busy, setBusy] = useState(false);
  const options = roles.includes(user.role) ? roles : [user.role, ...roles];

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    if (d.role && d.role !== user.role && (d.role === "ADMIN" || d.role === "SUPER_ADMIN")) {
      const ok = await confirm({ title: `Grant ${ROLE_LABELS[d.role as Role]} access?`, description: "Administrators can publish listings, manage accounts and see every inquiry.", confirmLabel: "Grant access" });
      if (!ok) return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const j = await submitJson(`/api/admin/users/${user.id}`, "PATCH", { name: d.name, email: d.email, ...(d.role ? { role: d.role } : {}) });
      onSaved(j.message);
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Update failed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <Field label="Full name">
        <input className="input" name="name" required minLength={2} maxLength={100} defaultValue={user.name || ""} />
      </Field>
      <Field label="Email address" hint="The person signs in with this address.">
        <input className="input" name="email" type="email" required maxLength={254} defaultValue={user.email} />
      </Field>
      <Field label="Role" hint={isSelf ? "You cannot change your own role." : "Only a Super Admin can grant or change administrator roles."}>
        <select className="select" name="role" defaultValue={user.role} disabled={isSelf}>
          {options.map((r) => (
            <option key={r} value={r} disabled={!roles.includes(r)}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </Field>
      <FormAlert message={message} />
      <div className="form-actions">
        <SubmitButton busy={busy} busyLabel="Saving…">
          Save account
        </SubmitButton>
      </div>
    </form>
  );
}

/** Header actions on a user's profile page. */
export function UserProfileActions({ user, viewerId, roles, canManage }: { user: UserSummary; viewerId: string; roles: Role[]; canManage: boolean }) {
  const router = useRouter();
  const notify = useToast();
  const { suspend, activate, remove, isSelf } = useUserActions(viewerId);
  const [editing, setEditing] = useState(false);
  const self = isSelf(user);
  if (!canManage) return <p className="form-note">Only a Super Admin can change administrator accounts.</p>;
  return (
    <>
      <div className="detail-actions-bar">
        <button type="button" className="btn" onClick={() => setEditing(true)}>
          <Icon name="edit" size={16} /> Edit account
        </button>
        {!self &&
          (user.suspended ? (
            <button type="button" className="btn btn-secondary" onClick={() => activate(user)}>
              <Icon name="user-check" size={16} /> Activate
            </button>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={() => suspend(user)}>
              <Icon name="user-x" size={16} /> Suspend
            </button>
          ))}
        {!self && (
          <button type="button" className="btn btn-danger-ghost" onClick={() => remove(user, () => router.push("/admin/users"))}>
            <Icon name="trash" size={16} /> Delete
          </button>
        )}
      </div>
      <SlideOver open={editing} onClose={() => setEditing(false)} title="Edit account">
        {editing && (
          <UserEditForm
            user={user}
            roles={roles}
            isSelf={self}
            onSaved={(m) => {
              notify(m);
              setEditing(false);
              router.refresh();
            }}
          />
        )}
      </SlideOver>
    </>
  );
}
