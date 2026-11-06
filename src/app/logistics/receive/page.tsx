import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { tempZoneLabel } from "@/lib/temp-zone";
import { formatQty } from "@/lib/inventory";
import { ReceiveForm } from "./ReceiveForm";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LogisticsReceivePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireSession();
  const sp = await searchParams;
  const initialInboundId =
    typeof sp.inbound === "string" ? sp.inbound : null;

  const [items, locations, openLines] = await Promise.all([
    prisma.item.findMany({
      where: { hospitalId: user.hospitalId, isActive: true },
      orderBy: { sku: "asc" },
    }),
    prisma.location.findMany({
      where: { hospitalId: user.hospitalId, kind: "WAREHOUSE" },
      orderBy: { code: "asc" },
    }),
    prisma.inboundShipmentLine.findMany({
      where: {
        shipment: { hospitalId: user.hospitalId, status: "OPEN" },
      },
      include: { item: true, shipment: true },
      orderBy: { shipment: { referenceNumber: "asc" } },
    }),
  ]);

  const inboundLines = openLines
    .map((line) => {
      const remaining = line.quantityExpected.minus(line.quantityReceived);
      if (remaining.lessThanOrEqualTo(0)) return null;
      return {
        id: line.id,
        shipmentId: line.shipmentId,
        itemId: line.itemId,
        remaining: Number(remaining),
        label: `${line.shipment.referenceNumber} · ${line.item.sku} · remain ${formatQty(remaining)} ${line.item.uom}`,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  return (
    <div className="ops-page">
      <h1>Receive inbound</h1>
      <p className="lede">
        Receive to a warehouse location — ad-hoc or against an open PO/ASN line.
        Search by SKU, name, NDC, or UPC. Expected qty supports short/over with an
        audit note. Cold-chain items are blocked from ambient bins.
      </p>

      <ReceiveForm
        initialInboundId={initialInboundId}
        inboundLines={inboundLines}
        items={items.map((item) => ({
          id: item.id,
          sku: item.sku,
          name: item.name,
          uom: item.uom,
          ndc: item.ndc,
          upc: item.upc,
          requiresCold: item.requiresCold,
        }))}
        locations={locations.map((loc) => ({
          id: loc.id,
          label: `${loc.code} — ${loc.name}`,
          tempZone: tempZoneLabel(loc.tempZone),
        }))}
      />
    </div>
  );
}
