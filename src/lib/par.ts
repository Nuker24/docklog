import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type BelowParRow = {
  clinicId: string;
  clinicCode: string;
  clinicName: string;
  logisticsPushEnabled: boolean;
  itemId: string;
  sku: string;
  itemName: string;
  uom: string;
  commodityClass: string;
  parQty: Prisma.Decimal;
  onHand: Prisma.Decimal;
  shortfall: Prisma.Decimal;
};

/** Clinic on-hand vs par for expendable items (hospital-scoped). */
export async function listBelowPar(hospitalId: string): Promise<BelowParRow[]> {
  const pars = await prisma.clinicParLevel.findMany({
    where: { hospitalId },
    include: {
      clinic: true,
      item: true,
    },
    orderBy: [{ clinic: { code: "asc" } }, { item: { sku: "asc" } }],
  });

  if (!pars.length) return [];

  const clinicIds = [...new Set(pars.map((p) => p.clinicId))];
  const itemIds = [...new Set(pars.map((p) => p.itemId))];

  const balances = await prisma.inventoryBalance.findMany({
    where: {
      hospitalId,
      itemId: { in: itemIds },
      location: { clinicId: { in: clinicIds }, kind: "CLINIC" },
    },
    include: { location: true },
  });

  const onHandKey = (clinicId: string, itemId: string) => `${clinicId}:${itemId}`;
  const onHandMap = new Map<string, Prisma.Decimal>();
  for (const b of balances) {
    const clinicId = b.location.clinicId;
    if (!clinicId) continue;
    const key = onHandKey(clinicId, b.itemId);
    onHandMap.set(key, (onHandMap.get(key) ?? new Prisma.Decimal(0)).plus(b.quantity));
  }

  const rows: BelowParRow[] = [];
  for (const par of pars) {
    const onHand = onHandMap.get(onHandKey(par.clinicId, par.itemId)) ?? new Prisma.Decimal(0);
    if (onHand.greaterThanOrEqualTo(par.parQty)) continue;
    rows.push({
      clinicId: par.clinicId,
      clinicCode: par.clinic.code,
      clinicName: par.clinic.name,
      logisticsPushEnabled: par.clinic.logisticsPushEnabled,
      itemId: par.itemId,
      sku: par.item.sku,
      itemName: par.item.name,
      uom: par.item.uom,
      commodityClass: par.item.commodityClass,
      parQty: par.parQty,
      onHand,
      shortfall: par.parQty.minus(onHand),
    });
  }
  return rows;
}
