import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ClinicTransferForm } from "./ClinicTransferForm";

export default async function ClinicTransferPage() {
  const user = await requireSession();
  if (!user.clinicId) {
    return (
      <div className="ops-page">
        <h1>Clinic transfer</h1>
        <p className="lede">Your account is not assigned to a clinic.</p>
      </div>
    );
  }

  const [myClinic, clinics, stock, catalog] = await Promise.all([
    prisma.clinic.findUniqueOrThrow({ where: { id: user.clinicId } }),
    prisma.clinic.findMany({
      where: { hospitalId: user.hospitalId, NOT: { id: user.clinicId } },
      orderBy: { code: "asc" },
    }),
    prisma.inventoryBalance.findMany({
      where: {
        hospitalId: user.hospitalId,
        location: { clinicId: user.clinicId },
      },
      include: { item: true, lot: true, location: true },
    }),
    prisma.item.findMany({
      where: { hospitalId: user.hospitalId, isActive: true },
      orderBy: { sku: "asc" },
    }),
  ]);

  return (
    <div className="ops-page">
      <h1>Clinic → clinic transfer</h1>
      <p className="lede">
        Move on-hand stock from {myClinic.name} to another clinic. Destination
        confirms receipt. Pharmacy drugs may only leave Pharmacy SOS; other clinics
        transfer expendable medical supply.
      </p>

      <ClinicTransferForm
        isPharmacySos={myClinic.isPharmacySos}
        clinics={clinics.map((c) => ({
          id: c.id,
          label: `${c.code} — ${c.name}${c.isPharmacySos ? " (Pharmacy SOS)" : ""}`,
        }))}
        catalog={catalog.map((item) => ({
          id: item.id,
          sku: item.sku,
          name: item.name,
          uom: item.uom,
          ndc: item.ndc,
          upc: item.upc,
          commodityClass: item.commodityClass,
        }))}
        stock={stock.map((b) => ({
          key: b.id,
          itemId: b.itemId,
          lotId: b.lotId,
          locationId: b.locationId,
          qty: Number(b.quantity),
          lotNumber: b.lot.lotNumber,
          locationCode: b.location.code,
          commodityClass: b.item.commodityClass,
          expiresOn: b.lot.expiresOn
            ? b.lot.expiresOn.toISOString().slice(0, 10)
            : null,
        }))}
      />
    </div>
  );
}
