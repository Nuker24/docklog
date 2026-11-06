import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatQty } from "@/lib/inventory";
import { ReturnRecallForm } from "./ReturnRecallForm";

export default async function ClinicRecallsPage() {
  const user = await requireSession();
  if (!user.clinicId) {
    return (
      <div className="ops-page">
        <h1>Recall returns</h1>
        <p className="lede">Your account is not assigned to a clinic.</p>
      </div>
    );
  }

  const tasks = await prisma.recallReturnTask.findMany({
    where: {
      clinicId: user.clinicId,
      status: { in: ["OPEN", "RETURNED", "CONFIRMED"] },
      campaign: { hospitalId: user.hospitalId },
    },
    include: {
      item: true,
      lot: true,
      location: true,
      campaign: true,
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="ops-page">
      <h1>Recall returns</h1>
      <p className="lede">
        Pull recalled lots from clinic storage and mark them returned so logistics
        can confirm into quarantine / warehouse.
      </p>

      {tasks.length === 0 ? (
        <p className="empty">No recall tasks for your clinic.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Item / lot</th>
              <th>Location</th>
              <th>On-hand (snapshot)</th>
              <th>Reason</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id}>
                <td>
                  <span
                    className={`status-pill status-${
                      t.status === "OPEN"
                        ? "open"
                        : t.status === "RETURNED"
                          ? "warn"
                          : "fulfilled"
                    }`}
                  >
                    {t.status}
                  </span>
                </td>
                <td>
                  {t.item.sku} · lot {t.lot.lotNumber}
                </td>
                <td className="mono">{t.location.code}</td>
                <td>
                  {formatQty(t.quantityOnHand)} {t.item.uom}
                </td>
                <td>{t.campaign.reason}</td>
                <td>
                  {t.status === "OPEN" && (
                    <ReturnRecallForm
                      taskId={t.id}
                      maxQty={Number(t.quantityOnHand)}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
