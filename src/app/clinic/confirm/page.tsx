import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatQty } from "@/lib/inventory";
import { tempZoneLabel } from "@/lib/temp-zone";
import { ConfirmForm } from "./ConfirmForm";

export default async function ClinicConfirmPage() {
  const user = await requireSession();
  if (!user.clinicId) {
    return (
      <div className="ops-page">
        <h1>Confirm receipt</h1>
        <p className="lede">Your account is not assigned to a clinic.</p>
      </div>
    );
  }

  const [transfers, locations] = await Promise.all([
    prisma.transfer.findMany({
      where: {
        hospitalId: user.hospitalId,
        toClinicId: user.clinicId,
        status: "ISSUED",
      },
      include: {
        lines: { include: { item: true, lot: true } },
      },
      orderBy: { issuedAt: "asc" },
    }),
    prisma.location.findMany({
      where: {
        hospitalId: user.hospitalId,
        clinicId: user.clinicId,
        kind: "CLINIC",
      },
      orderBy: { code: "asc" },
    }),
  ]);

  return (
    <div className="ops-page">
      <h1>Confirm receipt</h1>
      <p className="lede">
        Confirm issued transfers into a clinic storage location. On-hand updates
        when you confirm.
      </p>

      <ConfirmForm
        transfers={transfers.map((t) => {
          const summary = t.lines
            .map(
              (l) =>
                `${l.item.sku} lot ${l.lot.lotNumber} × ${formatQty(l.quantity)}`,
            )
            .join("; ");
          return {
            id: t.id,
            label: `${t.kind.replaceAll("_", " ")} · ${summary} · ${t.issuedAt.toISOString().slice(0, 16).replace("T", " ")}`,
          };
        })}
        locations={locations.map((loc) => ({
          id: loc.id,
          label: `${loc.code} — ${loc.name} (${tempZoneLabel(loc.tempZone)})`,
        }))}
      />

      {transfers.length > 0 && (
        <section className="ops-list">
          <h2>Waiting confirmation</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Kind</th>
                <th>Lines</th>
                <th>Issued</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((t) => (
                <tr key={t.id}>
                  <td className="mono">{t.kind}</td>
                  <td>
                    {t.lines.map((l) => (
                      <div key={l.id}>
                        {l.item.sku} · {formatQty(l.quantity)} {l.item.uom} · lot{" "}
                        {l.lot.lotNumber}
                      </div>
                    ))}
                  </td>
                  <td className="mono">
                    {t.issuedAt.toISOString().slice(0, 16).replace("T", " ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
