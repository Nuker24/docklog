import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function LogisticsHomePage() {
  const session = await auth();
  const hospitalId = session!.user.hospitalId;

  const [locationCount, itemCount, balanceAgg] = await Promise.all([
    prisma.location.count({
      where: { hospitalId, kind: "WAREHOUSE" },
    }),
    prisma.item.count({ where: { hospitalId, isActive: true } }),
    prisma.inventoryBalance.aggregate({
      where: { hospitalId },
      _sum: { quantity: true },
    }),
  ]);

  return (
    <div className="stub-page">
      <h1>Logistics home</h1>
      <p className="lede">
        Central supply for {session!.user.hospitalName}. Receiving, putaway, and
        clinic issue workflows land in Phase 1 — this shell is the Phase 0 entry
        point.
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
          <dt>Units on hand (all lots)</dt>
          <dd>{Number(balanceAgg._sum.quantity ?? 0)}</dd>
        </div>
      </dl>

      <section className="stub-note">
        <h2>Phase 0 scope</h2>
        <ul>
          <li>One warehouse per hospital with temp-zone locations</li>
          <li>Item master includes expendable medical supply and pharmacy (NDC)</li>
          <li>
            Logistics issues expendable supply to clinics; Pharmacy SOS handles
            drug C2C
          </li>
          <li>Keyboard entry only — no barcode hardware yet</li>
        </ul>
      </section>
    </div>
  );
}
