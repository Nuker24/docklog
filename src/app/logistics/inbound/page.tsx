import Link from "next/link";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatQty } from "@/lib/inventory";
import { CreateInboundForm } from "./CreateInboundForm";

export default async function LogisticsInboundPage() {
  const user = await requireSession();

  const [items, shipments] = await Promise.all([
    prisma.item.findMany({
      where: { hospitalId: user.hospitalId, isActive: true },
      orderBy: { sku: "asc" },
    }),
    prisma.inboundShipment.findMany({
      where: { hospitalId: user.hospitalId },
      include: { lines: { include: { item: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <div className="ops-page">
      <h1>Inbound PO / ASN</h1>
      <p className="lede">
        Lightweight purchase-order / ASN headers for assisted receiving. No EDI —
        create expected lines here, then receive against them on{" "}
        <Link href="/logistics/receive">Receive</Link> (short/over still supported).
      </p>

      <CreateInboundForm
        items={items.map((item) => ({
          id: item.id,
          sku: item.sku,
          name: item.name,
          uom: item.uom,
          ndc: item.ndc,
          upc: item.upc,
          requiresCold: item.requiresCold,
        }))}
      />

      <section className="ops-list">
        <h2>Recent inbounds</h2>
        {shipments.length === 0 ? (
          <p className="empty">No inbound documents yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Vendor</th>
                <th>Status</th>
                <th>Lines</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => (
                <tr key={s.id}>
                  <td className="mono">{s.referenceNumber}</td>
                  <td>{s.vendorName ?? "—"}</td>
                  <td>
                    <span
                      className={`status-pill status-${s.status === "OPEN" ? "open" : "fulfilled"}`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td>
                    {s.lines.map((l) => (
                      <div key={l.id}>
                        {l.item.sku}: {formatQty(l.quantityReceived)}/
                        {formatQty(l.quantityExpected)} {l.item.uom}
                      </div>
                    ))}
                  </td>
                  <td>
                    {s.status === "OPEN" && (
                      <Link
                        className="btn-link"
                        href={`/logistics/receive?inbound=${s.id}`}
                      >
                        Receive
                      </Link>
                    )}
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
