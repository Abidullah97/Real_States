const tones: Record<string, { label: string; tone: string }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  PENDING: { label: "Pending review", tone: "warning" },
  PUBLISHED: { label: "Published", tone: "success" },
  SOLD: { label: "Sold", tone: "info" },
  RENTED: { label: "Rented", tone: "info" },
  ARCHIVED: { label: "Archived", tone: "neutral" },
  APPROVED: { label: "Approved", tone: "success" },
  REJECTED: { label: "Rejected", tone: "error" },
  NEW: { label: "New", tone: "accent" },
  READ: { label: "Read", tone: "neutral" },
  CONTACTED: { label: "Contacted", tone: "info" },
  QUALIFIED: { label: "Qualified", tone: "success" },
  CLOSED: { label: "Resolved", tone: "success" },
  SPAM: { label: "Spam", tone: "error" },
  USER: { label: "Regular user", tone: "neutral" },
  OWNER: { label: "Property owner", tone: "info" },
  AGENT: { label: "Agent", tone: "accent" },
  ADMIN: { label: "Admin", tone: "info" },
  SUPER_ADMIN: { label: "Super admin", tone: "warning" },
  FEATURED: { label: "Featured", tone: "accent" },
  EXPIRED: { label: "Expired", tone: "neutral" },
  ACTIVE: { label: "Active", tone: "success" },
  SUSPENDED: { label: "Suspended", tone: "error" },
};

/** Consistent label and colour for every workflow status in the product. */
export default function StatusBadge({ status, label }: { status: string; label?: string }) {
  const entry = tones[status] || { label: status.charAt(0) + status.slice(1).toLowerCase(), tone: "neutral" };
  return <span className={`badge badge-dot badge-${entry.tone}`}>{label || entry.label}</span>;
}
