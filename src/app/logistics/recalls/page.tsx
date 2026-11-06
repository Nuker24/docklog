import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatQty } from "@/lib/inventory";
import { CreateRecallForm } from "./CreateRecallForm";
import { ConfirmRecallForm } from "./ConfirmRecallForm";

export default async function LogisticsRecallsPage() {
  const user = await requireSession();

  const [items, campaigns, returnedTasks, warehouseLocs] = await Promise.all([
    prisma.item.findMany({
      where: { hospitalId: user.hospitalId, isActive: true },
      orderBy: { sku: "asc" },
    }),
    prisma.recallCampaign.findMany({
      where: { hospitalId: user.hospitalId },
      include: {
        lot: true,
        item: true,
        tasks: { include: { clinic: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.recallReturnTask.findMany({
      where: {
        campaign: { hospitalId: user.hospitalId },
        status: "RETURNED",
      },
      include: {
        clinic: true,
        item: true,
        lot: true,
        location: true,
        campaign: true,
      },
      orderBy: { returnedAt: "asc" },
    }),
    prisma.location.findMany({
      where: { hospitalId: user.hospitalId, kind: "WAREHOUSE" },
      orderBy: { code: "asc" },
    }),
  ]);

  return (
    <div className="ops-page">
      <h1>Recall campaigns</h1>
      <p className="lede">
        Open a recall by lot (or item/NDC). Held lots cannot be issued. Clinic
        locations with on-hand get return tasks; confirm returns into a warehouse
        location.
      </p>

      <CreateRecallForm
        items={items.map((item) => ({
          id: item.id,
          sku: item.sku,
          name: item.name,
          uom: item.uom,
          ndc: item.ndc,
          upc: item.upc,
        }))}
      />

      {returnedTasks.length > 0 && (
        <section className="ops-list">
          <h2>Awaiting logistics confirm</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Clinic</th>
                <th>Item / lot</th>
                <th>From</th>
                <th>Qty</th>
                <th>Confirm into</th>
              </tr>
            </thead>
            <tbody>
              {returnedTasks.map((t) => (
                <tr key={t.id}>
                  <td>{t.clinic.code}</td>
                  <td>
                    {t.item.sku} · lot {t.lot.lotNumber}
                  </td>
                  <td className="mono">{t.location.code}</td>
                  <td>
                    {formatQty(t.quantityReturned)} {t.item.uom}
                  </td>
                  <td>
                    <ConfirmRecallForm
                      taskId={t.id}
                      locations={warehouseLocs.map((l) => ({
                        id: l.id,
                        label: `${l.code} — ${l.name}`,
                      }))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="ops-list">
        <h2>Campaigns</h2>
        {campaigns.length === 0 ? (
          <p className="empty">No recalls yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Opened</th>
                <th>Status</th>
                <th>Target</th>
                <th>Reason</th>
                <th>Tasks</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td className="mono">
                    {c.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                  </td>
                  <td>
                    <span
                      className={`status-pill status-${c.status === "OPEN" ? "open" : "fulfilled"}`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td>
                    {c.lot
                      ? `Lot ${c.lot.lotNumber}`
                      : c.item
                        ? c.item.sku
                        : c.ndc
                          ? `NDC ${c.ndc}`
                          : "—"}
                    {c.referenceNumber ? ` · ${c.referenceNumber}` : ""}
                  </td>
                  <td>{c.reason}</td>
                  <td>
                    {c.tasks.filter((t) => t.status === "CONFIRMED").length}/
                    {c.tasks.length} confirmed
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
