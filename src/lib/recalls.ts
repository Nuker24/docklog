import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { adjustBalance } from "@/lib/inventory";

export async function createRecallCampaign(input: {
  hospitalId: string;
  actorId: string;
  reason: string;
  referenceNumber?: string;
  notes?: string;
  /** Prefer explicit lot id. */
  lotId?: string | null;
  /** Resolve by lot number (+ optional item/NDC). */
  lotNumber?: string | null;
  itemId?: string | null;
  ndc?: string | null;
}) {
  const reason = input.reason.trim();
  if (!reason) throw new Error("Recall reason is required.");

  let lot =
    input.lotId
      ? await prisma.lot.findFirst({
          where: { id: input.lotId, hospitalId: input.hospitalId },
          include: { item: true },
        })
      : null;

  if (!lot && input.lotNumber?.trim()) {
    const lotNumber = input.lotNumber.trim();
    const candidates = await prisma.lot.findMany({
      where: {
        hospitalId: input.hospitalId,
        lotNumber,
        ...(input.itemId ? { itemId: input.itemId } : {}),
        ...(input.ndc
          ? { item: { ndc: input.ndc.trim() } }
          : {}),
      },
      include: { item: true },
    });
    if (candidates.length === 0) {
      throw new Error(`No lot found for number ${lotNumber}.`);
    }
    if (candidates.length > 1 && !input.itemId && !input.ndc) {
      throw new Error(
        `Multiple lots share number ${lotNumber}. Narrow by item or NDC.`,
      );
    }
    lot = candidates[0];
  }

  if (!lot && (input.itemId || input.ndc)) {
    // Broader recall: hold all lots for item/NDC that have stock
    const items = await prisma.item.findMany({
      where: {
        hospitalId: input.hospitalId,
        ...(input.itemId ? { id: input.itemId } : {}),
        ...(input.ndc ? { ndc: input.ndc.trim() } : {}),
      },
    });
    if (!items.length) throw new Error("Item / NDC not found.");
    const itemIds = items.map((i) => i.id);
    const lots = await prisma.lot.findMany({
      where: { hospitalId: input.hospitalId, itemId: { in: itemIds } },
      include: { item: true },
    });
    if (!lots.length) throw new Error("No lots for that item/NDC.");

    return prisma.$transaction(async (tx) => {
      const campaign = await tx.recallCampaign.create({
        data: {
          hospitalId: input.hospitalId,
          status: "OPEN",
          reason,
          referenceNumber: input.referenceNumber?.trim() || null,
          notes: input.notes?.trim() || null,
          itemId: items.length === 1 ? items[0].id : null,
          ndc: input.ndc?.trim() || items[0].ndc || null,
          createdById: input.actorId,
        },
      });

      for (const held of lots) {
        await tx.lot.update({
          where: { id: held.id },
          data: { onHold: true },
        });
        await createTasksForLot(tx, {
          hospitalId: input.hospitalId,
          campaignId: campaign.id,
          lotId: held.id,
          itemId: held.itemId,
        });
      }

      await writeAudit(tx, {
        hospitalId: input.hospitalId,
        actorId: input.actorId,
        action: "RECALL_CREATE",
        entityType: "RecallCampaign",
        entityId: campaign.id,
        summary: `Opened recall for ${lots.length} lot(s) (${input.ndc ?? items[0].sku}): ${reason}`,
        metadata: {
          lotIds: lots.map((l) => l.id),
          itemIds,
          ndc: input.ndc ?? null,
          referenceNumber: input.referenceNumber ?? null,
        },
      });

      return tx.recallCampaign.findUniqueOrThrow({
        where: { id: campaign.id },
        include: {
          tasks: { include: { clinic: true, item: true, lot: true, location: true } },
          item: true,
          lot: true,
        },
      });
    });
  }

  if (!lot) {
    throw new Error("Provide a lot number (or lot id), or item/NDC for multi-lot recall.");
  }

  return prisma.$transaction(async (tx) => {
    await tx.lot.update({
      where: { id: lot!.id },
      data: { onHold: true },
    });

    const campaign = await tx.recallCampaign.create({
      data: {
        hospitalId: input.hospitalId,
        status: "OPEN",
        reason,
        referenceNumber: input.referenceNumber?.trim() || null,
        notes: input.notes?.trim() || null,
        lotId: lot!.id,
        itemId: lot!.itemId,
        ndc: lot!.item.ndc,
        createdById: input.actorId,
      },
    });

    await createTasksForLot(tx, {
      hospitalId: input.hospitalId,
      campaignId: campaign.id,
      lotId: lot!.id,
      itemId: lot!.itemId,
    });

    await writeAudit(tx, {
      hospitalId: input.hospitalId,
      actorId: input.actorId,
      action: "RECALL_CREATE",
      entityType: "RecallCampaign",
      entityId: campaign.id,
      summary: `Opened recall for lot ${lot!.lotNumber} (${lot!.item.sku}): ${reason}`,
      metadata: {
        lotId: lot!.id,
        lotNumber: lot!.lotNumber,
        itemId: lot!.itemId,
        sku: lot!.item.sku,
        referenceNumber: input.referenceNumber ?? null,
      },
    });

    await writeAudit(tx, {
      hospitalId: input.hospitalId,
      actorId: input.actorId,
      action: "RECALL_HOLD",
      entityType: "Lot",
      entityId: lot!.id,
      summary: `Held lot ${lot!.lotNumber} from further issue`,
      metadata: { campaignId: campaign.id },
    });

    return tx.recallCampaign.findUniqueOrThrow({
      where: { id: campaign.id },
      include: {
        tasks: { include: { clinic: true, item: true, lot: true, location: true } },
        item: true,
        lot: true,
      },
    });
  });
}

async function createTasksForLot(
  tx: Prisma.TransactionClient,
  input: {
    hospitalId: string;
    campaignId: string;
    lotId: string;
    itemId: string;
  },
) {
  const balances = await tx.inventoryBalance.findMany({
    where: {
      hospitalId: input.hospitalId,
      lotId: input.lotId,
      quantity: { gt: 0 },
      location: { kind: "CLINIC", clinicId: { not: null } },
    },
    include: { location: true },
  });

  for (const bal of balances) {
    if (!bal.location.clinicId) continue;
    await tx.recallReturnTask.create({
      data: {
        campaignId: input.campaignId,
        clinicId: bal.location.clinicId,
        locationId: bal.locationId,
        itemId: input.itemId,
        lotId: input.lotId,
        quantityOnHand: bal.quantity,
        status: "OPEN",
      },
    });
  }
}

export async function markRecallTaskReturned(input: {
  hospitalId: string;
  actorId: string;
  taskId: string;
  clinicId: string;
  quantityReturned: number;
  notes?: string;
}) {
  if (!(input.quantityReturned > 0)) {
    throw new Error("Returned quantity must be greater than zero.");
  }

  const task = await prisma.recallReturnTask.findFirst({
    where: {
      id: input.taskId,
      clinicId: input.clinicId,
      campaign: { hospitalId: input.hospitalId, status: "OPEN" },
      status: "OPEN",
    },
    include: { item: true, lot: true, location: true, clinic: true },
  });
  if (!task) throw new Error("Open recall return task not found.");

  if (new Prisma.Decimal(input.quantityReturned).greaterThan(task.quantityOnHand)) {
    throw new Error(
      `Returned qty cannot exceed on-hand snapshot (${task.quantityOnHand.toString()}).`,
    );
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.recallReturnTask.update({
      where: { id: task.id },
      data: {
        status: "RETURNED",
        quantityReturned: new Prisma.Decimal(input.quantityReturned),
        notes: input.notes?.trim() || null,
        returnedAt: new Date(),
        returnedById: input.actorId,
      },
      include: { item: true, lot: true, location: true, clinic: true },
    });

    await writeAudit(tx, {
      hospitalId: input.hospitalId,
      actorId: input.actorId,
      action: "RECALL_RETURN",
      entityType: "RecallReturnTask",
      entityId: task.id,
      summary: `${task.clinic.code} marked return of ${input.quantityReturned} ${task.item.uom} ${task.item.sku} lot ${task.lot.lotNumber} from ${task.location.code}`,
      metadata: {
        campaignId: task.campaignId,
        itemId: task.itemId,
        lotId: task.lotId,
        locationId: task.locationId,
        clinicId: task.clinicId,
        quantity: input.quantityReturned,
      },
    });

    return updated;
  });
}

export async function confirmRecallTask(input: {
  hospitalId: string;
  actorId: string;
  taskId: string;
  toLocationId: string;
  notes?: string;
}) {
  const task = await prisma.recallReturnTask.findFirst({
    where: {
      id: input.taskId,
      campaign: { hospitalId: input.hospitalId, status: "OPEN" },
      status: "RETURNED",
    },
    include: {
      item: true,
      lot: true,
      location: true,
      clinic: true,
      campaign: true,
    },
  });
  if (!task) throw new Error("Returned recall task not found.");

  const toLocation = await prisma.location.findFirst({
    where: {
      id: input.toLocationId,
      hospitalId: input.hospitalId,
      kind: "WAREHOUSE",
    },
  });
  if (!toLocation) {
    throw new Error("Confirm into a warehouse quarantine / putaway location.");
  }

  return prisma.$transaction(async (tx) => {
    await adjustBalance(tx, {
      hospitalId: input.hospitalId,
      locationId: task.locationId,
      itemId: task.itemId,
      lotId: task.lotId,
      delta: task.quantityReturned.negated(),
    });
    await adjustBalance(tx, {
      hospitalId: input.hospitalId,
      locationId: toLocation.id,
      itemId: task.itemId,
      lotId: task.lotId,
      delta: task.quantityReturned,
    });

    const updated = await tx.recallReturnTask.update({
      where: { id: task.id },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
        confirmedById: input.actorId,
        notes: input.notes?.trim() || task.notes,
      },
      include: { item: true, lot: true, clinic: true },
    });

    await writeAudit(tx, {
      hospitalId: input.hospitalId,
      actorId: input.actorId,
      action: "RECALL_CONFIRM",
      entityType: "RecallReturnTask",
      entityId: task.id,
      summary: `Confirmed recall return of ${task.quantityReturned.toString()} ${task.item.uom} ${task.item.sku} lot ${task.lot.lotNumber} from ${task.clinic.code} into ${toLocation.code}`,
      metadata: {
        campaignId: task.campaignId,
        fromLocationId: task.locationId,
        toLocationId: toLocation.id,
        quantity: task.quantityReturned.toString(),
        itemId: task.itemId,
        lotId: task.lotId,
      },
    });

    const openLeft = await tx.recallReturnTask.count({
      where: {
        campaignId: task.campaignId,
        status: { in: ["OPEN", "RETURNED"] },
      },
    });
    if (openLeft === 0) {
      await tx.recallCampaign.update({
        where: { id: task.campaignId },
        data: { status: "CLOSED", closedAt: new Date() },
      });
      await writeAudit(tx, {
        hospitalId: input.hospitalId,
        actorId: input.actorId,
        action: "RECALL_CLOSE",
        entityType: "RecallCampaign",
        entityId: task.campaignId,
        summary: `Closed recall campaign — all clinic return tasks confirmed`,
        metadata: { campaignId: task.campaignId },
      });
    }

    return updated;
  });
}

export async function assertLotNotOnHold(hospitalId: string, lotId: string) {
  const lot = await prisma.lot.findFirst({
    where: { id: lotId, hospitalId },
  });
  if (!lot) throw new Error("Lot not found.");
  if (lot.onHold) {
    throw new Error(
      `Lot ${lot.lotNumber} is on recall hold and cannot be issued or transferred.`,
    );
  }
}
