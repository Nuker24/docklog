import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AuditFilters = {
  hospitalId: string;
  from?: Date | null;
  to?: Date | null;
  action?: string | null;
  actorId?: string | null;
  q?: string | null;
  take?: number;
};

export function buildAuditWhere(filters: AuditFilters): Prisma.AuditEventWhereInput {
  const where: Prisma.AuditEventWhereInput = {
    hospitalId: filters.hospitalId,
  };

  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) where.createdAt.gte = filters.from;
    if (filters.to) where.createdAt.lte = filters.to;
  }
  if (filters.action?.trim()) {
    where.action = filters.action.trim();
  }
  if (filters.actorId?.trim()) {
    where.actorId = filters.actorId.trim();
  }
  if (filters.q?.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { summary: { contains: q, mode: "insensitive" } },
      { entityId: { contains: q, mode: "insensitive" } },
      { action: { contains: q, mode: "insensitive" } },
    ];
  }
  return where;
}

export async function listAuditEvents(filters: AuditFilters) {
  return prisma.auditEvent.findMany({
    where: buildAuditWhere(filters),
    include: { actor: { select: { username: true, displayName: true } } },
    orderBy: { createdAt: "desc" },
    take: Math.min(filters.take ?? 200, 2000),
  });
}

export function auditEventToCsvRow(event: {
  createdAt: Date;
  action: string;
  summary: string;
  entityType: string;
  entityId: string | null;
  actor: { username: string; displayName: string } | null;
  metadata: unknown;
}): string[] {
  const meta =
    event.metadata && typeof event.metadata === "object"
      ? (event.metadata as Record<string, unknown>)
      : {};
  const pick = (keys: string[]) => {
    for (const k of keys) {
      const v = meta[k];
      if (v != null && v !== "") return String(v);
    }
    return "";
  };

  return [
    event.createdAt.toISOString(),
    event.actor?.username ?? "",
    event.actor?.displayName ?? "",
    event.action,
    event.entityType,
    event.entityId ?? "",
    event.summary,
    pick(["itemId", "sku"]),
    pick(["lotId", "lotNumber"]),
    pick(["quantity", "quantityReceived"]),
    pick(["locationId", "fromLocationId", "toLocationId"]),
    JSON.stringify(meta),
  ];
}

export function toCsv(rows: string[][]): string {
  const escape = (cell: string) => {
    if (/[",\n\r]/.test(cell)) return `"${cell.replaceAll('"', '""')}"`;
    return cell;
  };
  return rows.map((r) => r.map(escape).join(",")).join("\n") + "\n";
}

export const AUDIT_CSV_HEADER = [
  "when",
  "actor_username",
  "actor_name",
  "action",
  "entity_type",
  "entity_id",
  "summary",
  "item",
  "lot",
  "qty",
  "location",
  "metadata_json",
];
