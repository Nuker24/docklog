import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatQty } from "@/lib/inventory";
import { IssueForm } from "./IssueForm";

export default async function LogisticsIssuePage() {
  const user = await requireSession();

  const [clinics, openRequests, balances] = await Promise.all([
    prisma.clinic.findMany({
      where: { hospitalId: user.hospitalId },
      orderBy: { code: "asc" },
    }),
    prisma.supplyRequest.findMany({
      where: {
        hospitalId: user.hospitalId,
        status: "OPEN",
        channel: "LOGISTICS",
      },
      include: {
        requestingClinic: true,
        lines: { include: { item: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.inventoryBalance.findMany({
      where: {
        hospitalId: user.hospitalId,
        location: { kind: "WAREHOUSE" },
      },
      include: {
        item: true,
        lot: true,
        location: true,
      },
      orderBy: [{ item: { sku: "asc" } }, { lot: { lotNumber: "asc" } }],
    }),
  ]);

  const requests = openRequests.flatMap((req) =>
    req.lines
      .map((line) => {
        const remaining = line.quantityRequested.minus(line.quantityFulfilled);
        if (remaining.lessThanOrEqualTo(0)) return null;
        return {
          id: req.id,
          clinicId: req.requestingClinicId,
          itemId: line.itemId,
          remaining: Number(remaining),
          label: `${req.requestingClinic.code} · ${line.item.sku} · need ${formatQty(remaining)} ${line.item.uom}`,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null),
  );

  // Deduplicate request options by request id (MVP one line per request typically)
  const requestOpts = Object.values(
    Object.fromEntries(requests.map((r) => [r.id, r])),
  );

  return (
    <div className="ops-page">
      <h1>Issue / fulfill</h1>
      <p className="lede">
        Fulfill clinic requests or push expendable supply to clinics with push
        enabled. Pharmacy drugs are fulfilled by Pharmacy SOS (C2C) — logistics
        may still supply Pharmacy itself.
      </p>

      <IssueForm
        clinics={clinics.map((c) => ({
          id: c.id,
          label: `${c.code} — ${c.name}${c.isPharmacySos ? " (Pharmacy SOS)" : ""}${c.logisticsPushEnabled ? "" : " · push off"}`,
          pushEnabled: c.logisticsPushEnabled,
          isPharmacySos: c.isPharmacySos,
        }))}
        requests={requestOpts}
        stock={balances.map((b) => ({
          key: b.id,
          itemId: b.itemId,
          lotId: b.lotId,
          locationId: b.locationId,
          qty: Number(b.quantity),
          commodityClass: b.item.commodityClass,
          label: `${b.item.sku} · lot ${b.lot.lotNumber} · ${b.location.code} · ${formatQty(b.quantity)} ${b.item.uom}`,
        }))}
      />

      <section className="ops-list">
        <h2>Open logistics requests</h2>
        {openRequests.length === 0 ? (
          <p className="empty">None open.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Clinic</th>
                <th>Item</th>
                <th>Requested</th>
                <th>Fulfilled</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {openRequests.map((req) =>
                req.lines.map((line) => (
                  <tr key={line.id}>
                    <td>{req.requestingClinic.code}</td>
                    <td>
                      {line.item.sku}
                      <span className="muted"> {line.item.name}</span>
                    </td>
                    <td>
                      {formatQty(line.quantityRequested)} {line.item.uom}
                    </td>
                    <td>{formatQty(line.quantityFulfilled)}</td>
                    <td className="mono">
                      {req.createdAt.toISOString().slice(0, 10)}
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
