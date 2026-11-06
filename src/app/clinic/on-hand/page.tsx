import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { OnHandTable } from "@/components/inventory/OnHandTable";

export default async function ClinicOnHandPage() {
  const user = await requireSession();
  if (!user.clinicId) {
    return (
      <div className="ops-page">
        <h1>Clinic on-hand</h1>
        <p className="lede">Your account is not assigned to a clinic.</p>
      </div>
    );
  }

  const balances = await prisma.inventoryBalance.findMany({
    where: {
      hospitalId: user.hospitalId,
      location: { clinicId: user.clinicId },
    },
    include: {
      item: true,
      lot: true,
      location: true,
    },
    orderBy: [
      { location: { code: "asc" } },
      { item: { sku: "asc" } },
    ],
  });

  return (
    <div className="ops-page">
      <h1>Clinic on-hand</h1>
      <p className="lede">
        Balances at your clinic storage locations after receipt confirmation.
      </p>
      <OnHandTable
        emptyMessage="No clinic stock yet — confirm an issued transfer to put away."
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
