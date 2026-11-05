import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatQty } from "@/lib/inventory";
import { requestChannelForItem } from "@/lib/commodity-rules";
import { RequestForm } from "./RequestForm";
import { PharmacyFulfillForm } from "./PharmacyFulfillForm";
import { cancelRequestAction } from "./actions";

export default async function ClinicRequestsPage() {
  const user = await requireSession();
  if (!user.clinicId) {
    return (
      <div className="ops-page">
        <h1>Requests</h1>
        <p className="lede">Your account is not assigned to a clinic.</p>
      </div>
    );
  }

  const clinic = await prisma.clinic.findUniqueOrThrow({
    where: { id: user.clinicId },
  });

  const [items, myRequests, inboundPharmacyRequests, pharmacyStock] =
    await Promise.all([
      prisma.item.findMany({
        where: {
          hospitalId: user.hospitalId,
          isActive: true,
          // Pharmacy SOS doesn't request drugs from itself
          ...(clinic.isPharmacySos
            ? { commodityClass: "EXPENDABLE_MEDICAL_SUPPLY" }
            : {}),
        },
        orderBy: { sku: "asc" },
      }),
      prisma.supplyRequest.findMany({
        where: {
          hospitalId: user.hospitalId,
          requestingClinicId: user.clinicId,
        },
        include: {
          lines: { include: { item: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 25,
      }),
      clinic.isPharmacySos
        ? prisma.supplyRequest.findMany({
            where: {
              hospitalId: user.hospitalId,
              channel: "PHARMACY_SOS",
              status: "OPEN",
            },
            include: {
              requestingClinic: true,
              lines: { include: { item: true } },
            },
            orderBy: { createdAt: "asc" },
          })
        : Promise.resolve([]),
      clinic.isPharmacySos
        ? prisma.inventoryBalance.findMany({
            where: {
              hospitalId: user.hospitalId,
              location: { clinicId: user.clinicId },
              item: { commodityClass: "PHARMACY" },
            },
            include: { item: true, lot: true, location: true },
          })
        : Promise.resolve([]),
    ]);

  const fulfillRequests = inboundPharmacyRequests.flatMap((req) =>
    req.lines
      .map((line) => {
        const remaining = line.quantityRequested.minus(line.quantityFulfilled);
        if (remaining.lessThanOrEqualTo(0)) return null;
        return {
          id: req.id,
          clinicId: req.requestingClinicId,
          itemId: line.itemId,
          remaining: Number(remaining),
          label: `${req.requestingClinic.code} · ${line.item.sku} · need ${formatQty(remaining)}`,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null),
  );
  const fulfillOpts = Object.values(
    Object.fromEntries(fulfillRequests.map((r) => [r.id, r])),
  );

  return (
    <div className="ops-page">
      <h1>Supply requests</h1>
      <p className="lede">
        Request expendable medical supply from logistics
        {clinic.isPharmacySos
          ? ". As Pharmacy SOS, fulfill drug requests from other clinics below."
          : ", or pharmacy items from Pharmacy SOS (C2C)."}
      </p>

      <RequestForm
        items={items.map((item) => ({
          id: item.id,
          label: `${item.sku} — ${item.name} (${item.uom})`,
          channel: requestChannelForItem(item.commodityClass),
        }))}
      />

      <section className="ops-list">
        <h2>My requests</h2>
        {myRequests.length === 0 ? (
          <p className="empty">No requests yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Channel</th>
                <th>Item</th>
                <th>Qty</th>
                <th>Date</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {myRequests.map((req) =>
                req.lines.map((line) => (
                  <tr key={line.id}>
                    <td>
                      <span className={`status-pill status-${req.status.toLowerCase()}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="mono">{req.channel}</td>
                    <td>
                      {line.item.sku}
                      <span className="muted"> {line.item.name}</span>
                    </td>
                    <td>
                      {formatQty(line.quantityFulfilled)}/
                      {formatQty(line.quantityRequested)} {line.item.uom}
                    </td>
                    <td className="mono">
                      {req.createdAt.toISOString().slice(0, 10)}
                    </td>
                    <td>
                      {req.status === "OPEN" && (
                        <form action={cancelRequestAction}>
                          <input type="hidden" name="requestId" value={req.id} />
                          <button type="submit" className="btn-link">
                            Cancel
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        )}
      </section>

      {clinic.isPharmacySos && (
        <section className="ops-list">
          <h2>Pharmacy SOS — fulfill clinic drug requests</h2>
          <PharmacyFulfillForm
            requests={fulfillOpts}
            stock={pharmacyStock.map((b) => ({
              key: b.id,
              itemId: b.itemId,
              lotId: b.lotId,
              locationId: b.locationId,
              qty: Number(b.quantity),
              label: `${b.item.sku} · lot ${b.lot.lotNumber} · ${b.location.code} · ${formatQty(b.quantity)}`,
            }))}
          />
        </section>
      )}
    </div>
  );
}
