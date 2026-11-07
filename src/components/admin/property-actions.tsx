"use client";
import { useRouter } from "next/navigation";
import type { RowAction } from "@/components/dashboard/row-actions";
import { useConfirm, usePrompt } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";

export type ActionTarget = { id: string; slug: string; title: string; reference: string; status: string; featured: boolean };

/** Every listing status/feature transition, with confirmations, shared by the table and the detail page. */
export function usePropertyActions(isAdmin: boolean) {
  const router = useRouter();
  const confirm = useConfirm();
  const prompt = usePrompt();
  const notify = useToast();

  async function patch(row: ActionTarget, body: object) {
    try {
      const r = await fetch(`/api/admin/properties/${row.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Update failed.");
      notify(j.message);
      router.refresh();
      return true;
    } catch (e) {
      notify(e instanceof Error ? e.message : "Update failed.", "error");
      return false;
    }
  }

  const approve = async (row: ActionTarget) => (await confirm({ title: `Approve “${row.title}”?`, description: "The listing will be published on the website immediately.", confirmLabel: "Approve & publish" })) && patch(row, { status: "PUBLISHED" });
  const reject = async (row: ActionTarget) => {
    const reason = await prompt({ title: `Reject “${row.title}”?`, description: "The owner will see this reason on their dashboard and can resubmit after making changes.", confirmLabel: "Reject listing", tone: "danger", input: { label: "Reason for rejection", minLength: 5, multiline: true, placeholder: "e.g. Photos are missing and the price looks incorrect." } });
    if (reason) await patch(row, { status: "REJECTED", rejectionReason: reason });
  };
  const publish = async (row: ActionTarget) => (await confirm({ title: `Publish “${row.title}”?`, description: "It will become visible to everyone on the website.", confirmLabel: "Publish" })) && patch(row, { status: "PUBLISHED" });
  const unpublish = async (row: ActionTarget) => (await confirm({ title: `Unpublish “${row.title}”?`, description: "It will be removed from search results and returned to drafts.", confirmLabel: "Unpublish" })) && patch(row, { status: "DRAFT" });
  const markSold = async (row: ActionTarget) => (await confirm({ title: `Mark “${row.title}” as sold?`, description: "Sold listings are removed from public search but kept for your records and reports.", confirmLabel: "Mark as sold" })) && patch(row, { status: "SOLD" });
  const markRented = async (row: ActionTarget) => (await confirm({ title: `Mark “${row.title}” as rented?`, description: "Rented listings are removed from public search but kept for your records and reports.", confirmLabel: "Mark as rented" })) && patch(row, { status: "RENTED" });
  const archive = async (row: ActionTarget) => (await confirm({ title: `Archive “${row.title}”?`, description: "Archived listings are hidden from the website. You can restore them later.", confirmLabel: "Archive" })) && patch(row, { status: "ARCHIVED" });
  const restore = (row: ActionTarget) => patch(row, { status: "DRAFT" });
  const feature = (row: ActionTarget) => patch(row, { featured: true });
  const unfeature = (row: ActionTarget) => patch(row, { featured: false });
  const submitForReview = async (row: ActionTarget) => (await confirm({ title: `Submit “${row.title}” for review?`, description: "An administrator will review it before it is published.", confirmLabel: "Submit for review" })) && patch(row, { status: "PENDING" });

  async function remove(row: ActionTarget, after?: () => void) {
    const ok = await confirm({ title: `Permanently delete ${row.reference}?`, description: `“${row.title}”, its photos and saved-home entries will be deleted. This cannot be undone.`, confirmLabel: "Delete permanently", tone: "danger" });
    if (!ok) return;
    try {
      const r = await fetch(`/api/admin/properties/${row.id}?confirm=delete`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Delete failed.");
      notify(j.message);
      if (after) after();
      else router.refresh();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Delete failed.", "error");
    }
  }

  /** Context-appropriate actions for a listing's current state. */
  function actionsFor(row: ActionTarget, extra: { onEdit?: () => void; detailsHref?: string; afterDelete?: () => void } = {}): RowAction[] {
    const list: RowAction[] = [];
    if (extra.detailsHref) list.push({ label: "View details", icon: "eye", onSelect: () => router.push(extra.detailsHref!) });
    if (extra.onEdit) list.push({ label: "Edit details & photos", icon: "edit", onSelect: extra.onEdit });
    if (row.status === "PUBLISHED") list.push({ label: "View on website", icon: "external", onSelect: () => {}, href: `/properties/${row.slug}` });
    if (!isAdmin) {
      if (["DRAFT", "REJECTED"].includes(row.status)) list.push({ label: "Submit for review", icon: "check-circle", onSelect: () => submitForReview(row) });
      if (row.status === "PENDING") list.push({ label: "Withdraw to draft", icon: "restore", onSelect: () => patch(row, { status: "DRAFT" }) });
      return list;
    }
    if (row.status === "PENDING") {
      list.push({ label: "Approve & publish", icon: "check-circle", onSelect: () => approve(row) });
      list.push({ label: "Reject", icon: "ban", tone: "danger", onSelect: () => reject(row) });
    }
    if (["DRAFT", "REJECTED"].includes(row.status)) list.push({ label: "Publish", icon: "eye", onSelect: () => publish(row) });
    if (row.status === "PUBLISHED") {
      list.push({ label: "Unpublish", icon: "eye-off", onSelect: () => unpublish(row) });
      list.push({ label: row.featured ? "Remove from featured" : "Mark as featured", icon: "star", onSelect: () => (row.featured ? unfeature(row) : feature(row)) });
      list.push({ label: "Mark as sold", icon: "key", onSelect: () => markSold(row) });
      list.push({ label: "Mark as rented", icon: "home", onSelect: () => markRented(row) });
    }
    if (["SOLD", "RENTED"].includes(row.status)) list.push({ label: "Relist (publish)", icon: "restore", onSelect: () => publish(row) });
    if (!["ARCHIVED"].includes(row.status)) list.push({ label: "Archive", icon: "archive", onSelect: () => archive(row) });
    if (row.status === "ARCHIVED") list.push({ label: "Restore as draft", icon: "restore", onSelect: () => restore(row) });
    if (["ARCHIVED", "REJECTED"].includes(row.status)) list.push({ label: "Delete permanently", icon: "trash", tone: "danger", onSelect: () => remove(row, extra.afterDelete) });
    return list;
  }

  return { actionsFor, patch };
}
