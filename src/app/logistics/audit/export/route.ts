import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canAccessLogistics } from "@/lib/roles";
import {
  AUDIT_CSV_HEADER,
  auditEventToCsvRow,
  listAuditEvents,
  toCsv,
} from "@/lib/audit-query";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || !canAccessLogistics(session.user.role)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const fromStr = url.searchParams.get("from");
  const toStr = url.searchParams.get("to");
  const action = url.searchParams.get("action");
  const actorId = url.searchParams.get("actorId");
  const q = url.searchParams.get("q");

  const events = await listAuditEvents({
    hospitalId: session.user.hospitalId,
    from: fromStr ? new Date(`${fromStr}T00:00:00.000Z`) : null,
    to: toStr ? new Date(`${toStr}T23:59:59.999Z`) : null,
    action,
    actorId,
    q,
    take: 5000,
  });

  const rows = [
    AUDIT_CSV_HEADER,
    ...events.map((e) =>
      auditEventToCsvRow({
        createdAt: e.createdAt,
        action: e.action,
        summary: e.summary,
        entityType: e.entityType,
        entityId: e.entityId,
        actor: e.actor,
        metadata: e.metadata,
      }),
    ),
  ];

  const body = toCsv(rows);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="docklog-audit-${stamp}.csv"`,
    },
  });
}
