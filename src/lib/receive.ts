import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { adjustBalance } from "@/lib/inventory";
import { checkTempZoneCompatibility } from "@/lib/temp-zone";

export type ReceiveInput = {
  hospitalId: string;
  actorId: string;
  itemId: string;
  lotNumber: string;
  expiresOn?: string | null;
  quantity: number;
  locationId: string;
  acknowledgeTempWarning?: boolean;
};

export async function receiveInbound(input: ReceiveInput) {
  if (!input.lotNumber.trim()) {
    throw new Error("Lot number is required.");
  }
  if (!(input.quantity > 0)) {
    throw new Error("Quantity must be greater than zero.");
  }

  const [item, location] = await Promise.all([
    prisma.item.findFirst({
      where: { id: input.itemId, hospitalId: input.hospitalId, isActive: true },
    }),
    prisma.location.findFirst({
      where: {
        id: input.locationId,
        hospitalId: input.hospitalId,
        kind: "WAREHOUSE",
      },
    }),
  ]);

  if (!item) throw new Error("Item not found.");
  if (!location) throw new Error("Warehouse location not found.");

  const zoneCheck = checkTempZoneCompatibility({
    requiresCold: item.requiresCold,
    locationTempZone: location.tempZone,
    locationLabel: `${location.code} ${location.name}`,
    acknowledgeWarning: input.acknowledgeTempWarning,
  });
  if (!zoneCheck.ok) {
    throw new Error(zoneCheck.error);
  }

  const expiresOn = input.expiresOn ? new Date(input.expiresOn) : null;
  if (expiresOn && Number.isNaN(expiresOn.getTime())) {
    throw new Error("Invalid expiry date.");
  }

  return prisma.$transaction(async (tx) => {
    const lot = await tx.lot.upsert({
      where: {
        itemId_lotNumber: {
          itemId: item.id,
          lotNumber: input.lotNumber.trim(),
        },
      },
      create: {
        hospitalId: input.hospitalId,
        itemId: item.id,
        lotNumber: input.lotNumber.trim(),
        expiresOn,
      },
      update: {
        expiresOn: expiresOn ?? undefined,
      },
    });

    await adjustBalance(tx, {
      hospitalId: input.hospitalId,
      locationId: location.id,
      itemId: item.id,
      lotId: lot.id,
      delta: new Prisma.Decimal(input.quantity),
    });

    await writeAudit(tx, {
      hospitalId: input.hospitalId,
      actorId: input.actorId,
      action: "RECEIVE",
      entityType: "Lot",
      entityId: lot.id,
      summary: `Received ${input.quantity} ${item.uom} of ${item.sku} lot ${lot.lotNumber} into ${location.code}`,
      metadata: {
        itemId: item.id,
        locationId: location.id,
        quantity: input.quantity,
        tempZone: location.tempZone,
        warning: zoneCheck.warning ?? null,
      },
    });

    return { lot, item, location };
  });
}
