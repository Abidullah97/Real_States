import { prisma } from "@/lib/prisma";

export type ReportRange = { from: Date; to: Date; label: string };
export type MonthRow = { month: string; listings: number; registrations: number; inquiries: number };
export type CountRow = { label: string; count: number };
export type AgentRow = { id: string; name: string; email: string; listings: number; published: number; inquiries: number; closed: number };
export type ApprovalStats = { approved: number; rejected: number; pending: number; rate: number | null };

const PRESETS: Record<string, number> = { "3m": 3, "6m": 6, "12m": 12, "24m": 24 };

/** Parses ?range= or ?from=&to= (YYYY-MM-DD). Defaults to the last 12 months. */
export function parseRange(params: { range?: string; from?: string; to?: string }): ReportRange {
  const now = new Date();
  const fromDate = params.from ? new Date(params.from) : null;
  const toDate = params.to ? new Date(params.to) : null;
  if (fromDate && toDate && !isNaN(+fromDate) && !isNaN(+toDate) && fromDate <= toDate) {
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);
    return { from: fromDate, to, label: `${params.from} to ${params.to}` };
  }
  const months = PRESETS[params.range || ""] ?? 12;
  const from = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  return { from, to: now, label: `Last ${months} months` };
}

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

function monthsBetween(from: Date, to: Date) {
  const keys: string[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  while (cursor <= to && keys.length < 60) {
    keys.push(monthKey(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return keys;
}

/** Every number below is computed from database records within the range. */
export async function buildReport(range: ReportRange) {
  const inRange = { gte: range.from, lte: range.to };
  const [listings, users, inquiries, types, listingTypes, approvalLogs, pendingProps, pendingSubs, agents] = await Promise.all([
    prisma.property.findMany({ where: { createdAt: inRange }, select: { createdAt: true } }),
    prisma.user.findMany({ where: { createdAt: inRange }, select: { createdAt: true } }),
    prisma.inquiry.findMany({ where: { createdAt: inRange }, select: { createdAt: true } }),
    prisma.property.groupBy({ by: ["propertyType"], where: { createdAt: inRange }, _count: { _all: true } }),
    prisma.property.groupBy({ by: ["listingType"], where: { createdAt: inRange }, _count: { _all: true } }),
    prisma.auditLog.groupBy({ by: ["action"], where: { createdAt: inRange, action: { in: ["property.approve", "property.reject", "submission.approve", "submission.reject"] } }, _count: { _all: true } }),
    prisma.property.count({ where: { status: "PENDING" } }),
    prisma.propertySubmission.count({ where: { status: "PENDING" } }),
    prisma.user.findMany({
      where: { role: "AGENT" },
      select: {
        id: true,
        name: true,
        email: true,
        properties: { select: { status: true } },
        agentListings: { select: { status: true } },
        assignedInquiries: { where: { createdAt: inRange }, select: { status: true } },
      },
    }),
  ]);

  const months = monthsBetween(range.from, range.to);
  const tally = (rows: { createdAt: Date }[]) => {
    const map = new Map<string, number>();
    for (const r of rows) map.set(monthKey(r.createdAt), (map.get(monthKey(r.createdAt)) || 0) + 1);
    return map;
  };
  const [l, u, i] = [tally(listings), tally(users), tally(inquiries)];
  const monthly: MonthRow[] = months.map((m) => ({ month: m, listings: l.get(m) || 0, registrations: u.get(m) || 0, inquiries: i.get(m) || 0 }));

  const count = (action: string) => approvalLogs.find((a) => a.action === action)?._count._all ?? 0;
  const approved = count("property.approve") + count("submission.approve");
  const rejected = count("property.reject") + count("submission.reject");
  const approval: ApprovalStats = { approved, rejected, pending: pendingProps + pendingSubs, rate: approved + rejected ? Math.round((approved / (approved + rejected)) * 100) : null };

  const agentRows: AgentRow[] = agents
    .map((a) => {
      const all = [...a.properties, ...a.agentListings];
      return {
        id: a.id,
        name: a.name || a.email,
        email: a.email,
        listings: all.length,
        published: all.filter((p) => p.status === "PUBLISHED").length,
        inquiries: a.assignedInquiries.length,
        closed: a.assignedInquiries.filter((q) => q.status === "CLOSED" || q.status === "QUALIFIED").length,
      };
    })
    .sort((a, b) => b.published - a.published || b.inquiries - a.inquiries);

  return {
    range,
    monthly,
    totals: { listings: listings.length, registrations: users.length, inquiries: inquiries.length },
    types: types.map((t) => ({ label: t.propertyType, count: t._count._all })).sort((a, b) => b.count - a.count) as CountRow[],
    saleVsRent: [
      { label: "For sale", count: listingTypes.find((t) => t.listingType === "SALE")?._count._all ?? 0 },
      { label: "For rent", count: listingTypes.find((t) => t.listingType === "RENT")?._count._all ?? 0 },
    ] as CountRow[],
    approval,
    agents: agentRows,
  };
}

/** CSV with formula-injection protection (cells starting with = + - @ are prefixed). */
export function toCsv(headers: string[], rows: (string | number | null)[][]) {
  const cell = (v: string | number | null) => {
    let s = v === null ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
}
