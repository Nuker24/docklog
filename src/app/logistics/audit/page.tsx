import Link from "next/link";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { listAuditEvents } from "@/lib/audit-query";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function param(sp: Record<string, string | string[] | undefined>, key: string) {
  const v = sp[key];
  return typeof v === "string" ? v : "";
}

export default async function LogisticsAuditPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireSession();
  const sp = await searchParams;

  const fromStr = param(sp, "from");
  const toStr = param(sp, "to");
  const action = param(sp, "action");
  const actorId = param(sp, "actorId");
  const q = param(sp, "q");

  const from = fromStr ? new Date(`${fromStr}T00:00:00.000Z`) : null;
  const to = toStr ? new Date(`${toStr}T23:59:59.999Z`) : null;

  const [actors, actions, events] = await Promise.all([
    prisma.user.findMany({
      where: { hospitalId: user.hospitalId },
      select: { id: true, username: true, displayName: true },
      orderBy: { username: "asc" },
    }),
    prisma.auditEvent.findMany({
      where: { hospitalId: user.hospitalId },
      distinct: ["action"],
      select: { action: true },
      orderBy: { action: "asc" },
    }),
    listAuditEvents({
      hospitalId: user.hospitalId,
      from,
      to,
      action: action || null,
      actorId: actorId || null,
      q: q || null,
      take: 250,
    }),
  ]);

  const exportQs = new URLSearchParams();
  if (fromStr) exportQs.set("from", fromStr);
  if (toStr) exportQs.set("to", toStr);
  if (action) exportQs.set("action", action);
  if (actorId) exportQs.set("actorId", actorId);
  if (q) exportQs.set("q", q);

  return (
    <div className="ops-page">
      <h1>Audit log</h1>
      <p className="lede">
        Filter hospital audit events by who / when / action / free-text (item, lot,
        location in summary). Export matching rows as CSV.
      </p>

      <form method="get" className="ops-form filter-form">
        <div className="field-row">
          <div className="field">
            <label htmlFor="from">From</label>
            <input id="from" name="from" type="date" defaultValue={fromStr} />
          </div>
          <div className="field">
            <label htmlFor="to">To</label>
            <input id="to" name="to" type="date" defaultValue={toStr} />
          </div>
          <div className="field">
            <label htmlFor="action">Action</label>
            <select id="action" name="action" defaultValue={action}>
              <option value="">All</option>
              {actions.map((a) => (
                <option key={a.action} value={a.action}>
                  {a.action}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="actorId">Actor</label>
            <select id="actorId" name="actorId" defaultValue={actorId}>
              <option value="">All</option>
              {actors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.username}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="q">Search summary</label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="SKU, lot, location, clinic…"
          />
        </div>
        <div className="filter-actions">
          <button type="submit" className="btn-primary">
            Apply filters
          </button>
          <Link
            className="btn-link"
            href={`/logistics/audit/export?${exportQs.toString()}`}
          >
            Export CSV
          </Link>
        </div>
      </form>

      <section className="ops-list">
        <h2>
          Events <span className="muted">({events.length} shown)</span>
        </h2>
        {events.length === 0 ? (
          <p className="empty">No audit events match.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>Action</th>
                <th>Summary</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td className="mono">
                    {e.createdAt.toISOString().slice(0, 19).replace("T", " ")}
                  </td>
                  <td>{e.actor?.username ?? "—"}</td>
                  <td className="mono">{e.action}</td>
                  <td>{e.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
