import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { OnHandTable } from "@/components/inventory/OnHandTable";

export default async function LogisticsOnHandPage() {
  const user = await requireSession();

  const balances = await prisma.inventoryBalance.findMany({
    where: {
      hospitalId: user.hospitalId,
      location: { kind: "WAREHOUSE" },
    },
    include: {
      item: true,
      lot: true,
      location: true,
    },
    orderBy: [
      { location: { code: "asc" } },
      { item: { sku: "asc" } },
      { lot: { lotNumber: "asc" } },
    ],
  });

  return (
    <div className="ops-page">
      <h1>Warehouse on-hand</h1>
      <p className="lede">
        Central supply balances by location, item, and lot. Issued transfers leave
        warehouse stock immediately; clinic on-hand updates on confirm.
      </p>
      <OnHandTable
        emptyMessage="No warehouse stock yet — receive inbound to seed locations."
        rows={balances.map((b) => ({
          id: b.id,
          sku: b.item.sku,
          itemName: b.item.name,
          commodityClass: b.item.commodityClass,
          lotNumber: b.lot.lotNumber,
          expiresOn: b.lot.expiresOn,
          locationCode: b.location.code,
          locationName: b.location.name,
          tempZone: b.location.tempZone,
          quantity: b.quantity,
          uom: b.item.uom,
        }))}
      />
    </div>
  );
}
