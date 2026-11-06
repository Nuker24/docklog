import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { listBelowPar } from "@/lib/par";

export default async function LogisticsHomePage() {
  const session = await auth();
  const hospitalId = session!.user.hospitalId;

  const [
    locationCount,
    itemCount,
    openRequests,
    issuedTransfers,
    balanceAgg,
    belowPar,
  ] = await Promise.all([
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
    listBelowPar(hospitalId),
  ]);

  return (
    <div className="ops-page">
      <h1>Logistics home</h1>
      <p className="lede">
        Central supply for {session!.user.hospitalName}. Phase 3 adds recall
        campaigns and a filterable audit export alongside Phase 2 ops depth.
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
        <div>
          <dt>Below par</dt>
          <dd>{belowPar.length}</dd>
        </div>
      </dl>

      <section className="quick-links">
        <h2>Workflow</h2>
        <ol>
          <li>
            <Link href="/logistics/receive">Receive inbound</Link> with optional
            expected qty (short/over + audit note).
          </li>
          <li>
            <Link href="/logistics/issue">Issue / fulfill</Link> with FEFO lot
            suggestions and near-expiry warnings.
          </li>
          <li>
            Check <Link href="/logistics/par">par / replenish</Link> and push
            suggestions for push-enabled clinics.
          </li>
          <li>
            <Link href="/logistics/cycle-count">Cycle count</Link> a warehouse
            location and adjust balances.
          </li>
        </ol>
      </section>
    </div>
  );
}
