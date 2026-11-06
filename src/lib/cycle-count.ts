import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { adjustBalance } from "@/lib/inventory";

export async function applyCycleCountLine(input: {
  hospitalId: string;
  actorId: string;
  locationId: string;
  itemId: string;
  lotId: string;
  countedQty: number;
  note?: string;
}) {
  if (input.countedQty < 0) {
    throw new Error("Counted quantity cannot be negative.");
  }

  const location = await prisma.location.findFirst({
    where: {
      id: input.locationId,
      hospitalId: input.hospitalId,
      kind: "WAREHOUSE",
    },
  });
  if (!location) throw new Error("Warehouse location not found.");

  const [item, lot, balance] = await Promise.all([
    prisma.item.findFirst({
      where: { id: input.itemId, hospitalId: input.hospitalId },
    }),
    prisma.lot.findFirst({
      where: {
        id: input.lotId,
        itemId: input.itemId,
        hospitalId: input.hospitalId,
      },
    }),
    prisma.inventoryBalance.findUnique({
      where: {
        hospitalId_locationId_itemId_lotId: {
          hospitalId: input.hospitalId,
          locationId: input.locationId,
          itemId: input.itemId,
          lotId: input.lotId,
        },
      },
    }),
  ]);

  if (!item) throw new Error("Item not found.");
  if (!lot) throw new Error("Lot not found.");

  const systemQty = balance?.quantity ?? new Prisma.Decimal(0);
  const counted = new Prisma.Decimal(input.countedQty);
  const delta = counted.minus(systemQty);
  if (delta.isZero()) {
    return {
      adjusted: false,
      systemQty,
      counted,
      delta,
      item,
      lot,
      location,
    };
  }

  await prisma.$transaction(async (tx) => {
    await adjustBalance(tx, {
      hospitalId: input.hospitalId,
      locationId: location.id,
      itemId: item.id,
      lotId: lot.id,
      delta,
    });

    await writeAudit(tx, {
      hospitalId: input.hospitalId,
      actorId: input.actorId,
      action: "CYCLE_COUNT",
      entityType: "InventoryBalance",
      entityId: balance?.id ?? null,
      summary: `Cycle count ${location.code} ${item.sku} lot ${lot.lotNumber}: system ${systemQty.toString()} → counted ${counted.toString()} (Δ ${delta.toString()})`,
      metadata: {
        locationId: location.id,
        itemId: item.id,
        lotId: lot.id,
        systemQty: systemQty.toString(),
        countedQty: counted.toString(),
        delta: delta.toString(),
        note: input.note?.trim() || null,
      },
    });
  });

  return {
    adjusted: true,
    systemQty,
    counted,
    delta,
    item,
    lot,
    location,
  };
}
