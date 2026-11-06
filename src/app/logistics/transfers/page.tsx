import Link from "next/link";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatQty } from "@/lib/inventory";

export default async function LogisticsTransfersPage() {
  const user = await requireSession();

  const transfers = await prisma.transfer.findMany({
    where: { hospitalId: user.hospitalId },
    include: {
      toClinic: true,
      fromClinic: true,
      lines: { include: { item: true } },
    },
    orderBy: { issuedAt: "desc" },
    take: 40,
  });

  return (
    <div className="ops-page">
      <h1>Transfers / pick lists</h1>
      <p className="lede">
        Recent outbound issues and clinic transfers. Open a printable pick list /
        packing slip for any transfer.
      </p>

      {transfers.length === 0 ? (
        <p className="empty">No transfers yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Issued</th>
              <th>Kind</th>
              <th>To</th>
              <th>Lines</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {transfers.map((t) => (
              <tr key={t.id}>
                <td className="mono">
                  {t.issuedAt.toISOString().slice(0, 16).replace("T", " ")}
                </td>
                <td className="mono">{t.kind}</td>
                <td>{t.toClinic.code}</td>
                <td>
                  {t.lines
                    .map(
                      (l) =>
                        `${l.item.sku} × ${formatQty(l.quantity)}`,
                    )
                    .join("; ")}
                </td>
                <td>
                  <span
                    className={`status-pill status-${t.status === "ISSUED" ? "open" : "fulfilled"}`}
                  >
                    {t.status}
                  </span>
                </td>
                <td>
                  <Link
                    className="btn-link"
                    href={`/print/transfer/${t.id}`}
                    target="_blank"
                  >
                    Print slip
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
