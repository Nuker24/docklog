import { Prisma } from "@prisma/client";
import type { Prisma as PrismaNS } from "@prisma/client";

type Tx = PrismaNS.TransactionClient;

export async function adjustBalance(
  tx: Tx,
  input: {
    hospitalId: string;
    locationId: string;
    itemId: string;
    lotId: string;
    delta: Prisma.Decimal | number | string;
  },
) {
  const delta = new Prisma.Decimal(input.delta);
  const existing = await tx.inventoryBalance.findUnique({
    where: {
      hospitalId_locationId_itemId_lotId: {
        hospitalId: input.hospitalId,
        locationId: input.locationId,
        itemId: input.itemId,
        lotId: input.lotId,
      },
    },
  });

  if (!existing) {
    if (delta.lessThan(0)) {
      throw new Error("Insufficient on-hand quantity for this lot/location.");
    }
    return tx.inventoryBalance.create({
      data: {
        hospitalId: input.hospitalId,
        locationId: input.locationId,
        itemId: input.itemId,
        lotId: input.lotId,
        quantity: delta,
      },
    });
  }

  const next = existing.quantity.plus(delta);
  if (next.lessThan(0)) {
    throw new Error(
      `Insufficient on-hand (${existing.quantity.toString()}) for requested move (${delta.abs().toString()}).`,
    );
  }

  if (next.isZero()) {
    await tx.inventoryBalance.delete({ where: { id: existing.id } });
    return null;
  }

  return tx.inventoryBalance.update({
    where: { id: existing.id },
    data: { quantity: next },
  });
}

export function formatQty(value: Prisma.Decimal | number | string): string {
  const d = new Prisma.Decimal(value);
  return d.toFixed(d.mod(1).isZero() ? 0 : 3);
}
