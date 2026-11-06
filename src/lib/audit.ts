import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function writeAudit(
  tx: Prisma.TransactionClient | typeof prisma,
  input: {
    hospitalId: string;
    actorId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    summary: string;
    metadata?: Prisma.InputJsonValue;
  },
) {
  return tx.auditEvent.create({
    data: {
      hospitalId: input.hospitalId,
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      summary: input.summary,
      metadata: input.metadata,
    },
  });
}
