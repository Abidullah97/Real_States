import { prisma } from "@/lib/prisma";

const SECRET_KEYS = /pass(word)?|token|secret|hash|key|signature/i;

/** Removes anything that looks like a credential before metadata is stored in the audit log. */
function scrub(metadata?: Record<string, unknown>) {
  if (!metadata) return undefined;
  return Object.fromEntries(Object.entries(metadata).filter(([k, v]) => !SECRET_KEYS.test(k) && v !== undefined));
}

/** Records an administrative action. Logging failures never break the action itself. */
export async function logAction(actorId: string, action: string, entity: string, entityId: string, metadata?: Record<string, unknown>) {
  try {
    await prisma.auditLog.create({ data: { actorId, action, entity, entityId, metadata: scrub(metadata) as object | undefined } });
  } catch {}
}
