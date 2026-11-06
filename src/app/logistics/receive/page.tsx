import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { tempZoneLabel } from "@/lib/temp-zone";
import { ReceiveForm } from "./ReceiveForm";

export default async function LogisticsReceivePage() {
  const user = await requireSession();

  const [items, locations] = await Promise.all([
    prisma.item.findMany({
      where: { hospitalId: user.hospitalId, isActive: true },
      orderBy: { sku: "asc" },
    }),
    prisma.location.findMany({
      where: { hospitalId: user.hospitalId, kind: "WAREHOUSE" },
      orderBy: { code: "asc" },
    }),
  ]);

  return (
    <div className="ops-page">
      <h1>Receive inbound</h1>
      <p className="lede">
        Ad-hoc receive to a warehouse location (receive-to-bin). Keyboard entry —
        capture item, lot, expiry, and quantity. Cold-chain items are blocked from
        ambient bins.
      </p>

      <ReceiveForm
        items={items.map((item) => ({
          id: item.id,
          label: `${item.sku} — ${item.name} (${item.uom})${item.requiresCold ? " · COLD" : ""}`,
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
