import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function LogisticsHomePage() {
  const session = await auth();
  const hospitalId = session!.user.hospitalId;

  const [locationCount, itemCount, openRequests, issuedTransfers, balanceAgg] =
    await Promise.all([
      prisma.location.count({
        where: { hospitalId, kind: "WAREHOUSE" },
      }),
      prisma.item.count({ where: { hospitalId, isActive: true } }),
      prisma.supplyRequest.count({
        where: { hospitalId, channel: "LOGISTICS", status: "OPEN" },
      }),
      prisma.transfer.count({
        where: {
          hospitalId,
          status: "ISSUED",
          kind: { in: ["REQUEST_FULFILLMENT", "LOGISTICS_PUSH"] },
        },
      }),
      prisma.inventoryBalance.aggregate({
        where: { hospitalId, location: { kind: "WAREHOUSE" } },
        _sum: { quantity: true },
      }),
    ]);

  return (
    <div className="ops-page">
      <h1>Logistics home</h1>
      <p className="lede">
        Central supply for {session!.user.hospitalName}. Phase 1 MVP: receive →
        on-hand → fulfill clinic requests or push → clinic confirms.
      </p>

      <dl className="stub-stats">
        <div>
          <dt>Warehouse locations</dt>
          <dd>{locationCount}</dd>
        </div>
        <div>
          <dt>Active items</dt>
          <dd>{itemCount}</dd>
        </div>
        <div>
          <dt>Units on hand</dt>
          <dd>{Number(balanceAgg._sum.quantity ?? 0)}</dd>
        </div>
        <div>
          <dt>Open requests</dt>
          <dd>{openRequests}</dd>
        </div>
        <div>
          <dt>Awaiting clinic confirm</dt>
          <dd>{issuedTransfers}</dd>
        </div>
      </dl>

      <section className="quick-links">
        <h2>Workflow</h2>
        <ol>
          <li>
            <Link href="/logistics/receive">Receive inbound</Link> to a warehouse
            location (temp-zone checked).
          </li>
          <li>
            Review <Link href="/logistics/on-hand">warehouse on-hand</Link>.
          </li>
          <li>
            <Link href="/logistics/issue">Issue / fulfill</Link> open requests or
            push to push-enabled clinics (expendable only; Pharmacy may also
            receive pharmacy stock from logistics).
          </li>
        </ol>
      </section>
    </div>
  );
}
