import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatQty } from "@/lib/inventory";
import { CycleCountForm } from "./CycleCountForm";

export default async function LogisticsCycleCountPage() {
  const user = await requireSession();

  const [locations, balances, catalog, recentAudits] = await Promise.all([
    prisma.location.findMany({
      where: { hospitalId: user.hospitalId, kind: "WAREHOUSE" },
      orderBy: { code: "asc" },
    }),
    prisma.inventoryBalance.findMany({
      where: {
        hospitalId: user.hospitalId,
        location: { kind: "WAREHOUSE" },
      },
      include: { item: true, lot: true, location: true },
      orderBy: [{ location: { code: "asc" } }, { item: { sku: "asc" } }],
    }),
    prisma.item.findMany({
      where: { hospitalId: user.hospitalId, isActive: true },
      orderBy: { sku: "asc" },
    }),
    prisma.auditEvent.findMany({
      where: { hospitalId: user.hospitalId, action: "CYCLE_COUNT" },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="ops-page">
      <h1>Warehouse cycle count</h1>
      <p className="lede">
        Count a warehouse location (optionally filtered by item/lot). Posting
        adjusts on-hand to the counted quantity and writes an audit event. Clinic
        cycle count comes in a later PR.
      </p>

      <CycleCountForm
        locations={locations.map((l) => ({
          id: l.id,
          label: `${l.code} — ${l.name}`,
        }))}
        catalog={catalog.map((item) => ({
          id: item.id,
          sku: item.sku,
          name: item.name,
          uom: item.uom,
          ndc: item.ndc,
          upc: item.upc,
        }))}
        balances={balances.map((b) => ({
          key: b.id,
          locationId: b.locationId,
          itemId: b.itemId,
          lotId: b.lotId,
          sku: b.item.sku,
          lotNumber: b.lot.lotNumber,
          expiresOn: b.lot.expiresOn
            ? b.lot.expiresOn.toISOString().slice(0, 10)
            : null,
          qty: Number(b.quantity),
          label: `${b.item.sku} · lot ${b.lot.lotNumber} · system ${formatQty(b.quantity)} ${b.item.uom}`,
        }))}
      />

      <section className="ops-list">
        <h2>Recent cycle count audits</h2>
        {recentAudits.length === 0 ? (
          <p className="empty">No cycle counts posted yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Summary</th>
              </tr>
            </thead>
            <tbody>
              {recentAudits.map((a) => (
                <tr key={a.id}>
                  <td className="mono">
                    {a.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                  </td>
                  <td>{a.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
