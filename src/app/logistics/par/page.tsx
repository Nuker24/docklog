import Link from "next/link";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatQty } from "@/lib/inventory";
import { listBelowPar } from "@/lib/par";

export default async function LogisticsParPage() {
  const user = await requireSession();

  const [belowPar, allPars] = await Promise.all([
    listBelowPar(user.hospitalId),
    prisma.clinicParLevel.findMany({
      where: { hospitalId: user.hospitalId },
      include: { clinic: true, item: true },
      orderBy: [{ clinic: { code: "asc" } }, { item: { sku: "asc" } }],
    }),
  ]);

  const pushSuggestions = belowPar.filter(
    (r) =>
      r.logisticsPushEnabled &&
      r.commodityClass === "EXPENDABLE_MEDICAL_SUPPLY",
  );

  return (
    <div className="ops-page">
      <h1>Par / replenishment</h1>
      <p className="lede">
        Clinic+item par levels. Below-par rows highlight replenishment need.
        Push-enabled clinics get suggested issue links (expendable only).
      </p>

      <section className="ops-list">
        <h2>Below par</h2>
        {belowPar.length === 0 ? (
          <p className="empty">All configured pars are at or above target.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Clinic</th>
                <th>Item</th>
                <th className="num">On hand</th>
                <th className="num">Par</th>
                <th className="num">Short</th>
                <th>Push</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {belowPar.map((row) => (
                <tr key={`${row.clinicId}-${row.itemId}`}>
                  <td>
                    <span className="mono">{row.clinicCode}</span>{" "}
                    <span className="muted">{row.clinicName}</span>
                  </td>
                  <td>
                    <span className="mono">{row.sku}</span>{" "}
                    <span className="muted">{row.itemName}</span>
                  </td>
                  <td className="num">
                    {formatQty(row.onHand)} {row.uom}
                  </td>
                  <td className="num">{formatQty(row.parQty)}</td>
                  <td className="num">{formatQty(row.shortfall)}</td>
                  <td>
                    {row.logisticsPushEnabled ? (
                      <span className="status-pill status-open">Enabled</span>
                    ) : (
                      <span className="muted">Request only</span>
                    )}
                  </td>
                  <td>
                    {row.logisticsPushEnabled &&
                    row.commodityClass === "EXPENDABLE_MEDICAL_SUPPLY" ? (
                      <Link
                        className="btn-link"
                        href={`/logistics/issue?clinicId=${row.clinicId}&itemId=${row.itemId}&qty=${encodeURIComponent(row.shortfall.toString())}`}
                      >
                        Suggest push {formatQty(row.shortfall)}
                      </Link>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {pushSuggestions.length > 0 && (
        <section className="ops-list">
          <h2>Push suggestions</h2>
          <p className="field-hint" style={{ marginBottom: "0.75rem" }}>
            Clinics with logistics push enabled and expendable shortfall.
          </p>
          <ul className="quick-links" style={{ paddingLeft: "1.2rem" }}>
            {pushSuggestions.map((row) => (
              <li key={`sug-${row.clinicId}-${row.itemId}`}>
                <Link
                  href={`/logistics/issue?clinicId=${row.clinicId}&itemId=${row.itemId}&qty=${encodeURIComponent(row.shortfall.toString())}`}
                >
                  {row.clinicCode}: push {formatQty(row.shortfall)} {row.uom} of{" "}
                  {row.sku}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="ops-list">
        <h2>Configured par levels</h2>
        {allPars.length === 0 ? (
          <p className="empty">No par levels seeded yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Clinic</th>
                <th>Item</th>
                <th className="num">Par qty</th>
              </tr>
            </thead>
            <tbody>
              {allPars.map((p) => (
                <tr key={p.id}>
                  <td className="mono">{p.clinic.code}</td>
                  <td>
                    {p.item.sku}
                    <span className="muted"> {p.item.name}</span>
                  </td>
                  <td className="num">
                    {formatQty(p.parQty)} {p.item.uom}
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
