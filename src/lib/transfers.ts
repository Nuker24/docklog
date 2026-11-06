import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { adjustBalance } from "@/lib/inventory";
import {
  clinicMayTransferItem,
  logisticsMayIssueItemToClinic,
} from "@/lib/commodity-rules";

export type IssueLineInput = {
  itemId: string;
  lotId: string;
  fromLocationId: string;
  quantity: number;
};

async function assertSourceStock(
  hospitalId: string,
  line: IssueLineInput,
) {
  const balance = await prisma.inventoryBalance.findUnique({
    where: {
      hospitalId_locationId_itemId_lotId: {
        hospitalId,
        locationId: line.fromLocationId,
        itemId: line.itemId,
        lotId: line.lotId,
      },
    },
  });
  if (!balance || balance.quantity.lessThan(line.quantity)) {
    throw new Error(
      `Insufficient stock at source (need ${line.quantity}, have ${balance?.quantity.toString() ?? "0"}).`,
    );
  }
}

export async function issueTransfer(input: {
  hospitalId: string;
  actorId: string;
  toClinicId: string;
  lines: IssueLineInput[];
  requestId?: string | null;
  notes?: string;
  /** When true, issuer is Pharmacy SOS fulfilling a C2C drug request. */
  asPharmacySos?: boolean;
  /** Clinic→clinic transfer (expendable any clinic; pharmacy only from SOS). */
  asClinicTransfer?: boolean;
  issuerClinicId?: string | null;
}) {
  if (!input.lines.length) {
    throw new Error("Add at least one issue line.");
  }
  for (const line of input.lines) {
    if (!(line.quantity > 0)) {
      throw new Error("Each line quantity must be greater than zero.");
    }
  }

  const clinic = await prisma.clinic.findFirst({
    where: { id: input.toClinicId, hospitalId: input.hospitalId },
  });
  if (!clinic) throw new Error("Destination clinic not found.");

  let request =
    input.requestId != null
      ? await prisma.supplyRequest.findFirst({
          where: {
            id: input.requestId,
            hospitalId: input.hospitalId,
            status: "OPEN",
          },
          include: { lines: { include: { item: true } } },
        })
      : null;

  if (input.requestId && !request) {
    throw new Error("Open supply request not found.");
  }
  if (request && request.requestingClinicId !== clinic.id) {
    throw new Error("Request clinic does not match destination clinic.");
  }

  const itemIds = [...new Set(input.lines.map((l) => l.itemId))];
  const items = await prisma.item.findMany({
    where: { id: { in: itemIds }, hospitalId: input.hospitalId },
  });
  if (items.length !== itemIds.length) {
    throw new Error("One or more items were not found.");
  }
  const itemById = Object.fromEntries(items.map((i) => [i.id, i]));

  // Validate source locations
  const locationIds = [...new Set(input.lines.map((l) => l.fromLocationId))];
  const locations = await prisma.location.findMany({
    where: { id: { in: locationIds }, hospitalId: input.hospitalId },
    include: { clinic: true },
  });
  if (locations.length !== locationIds.length) {
    throw new Error("One or more source locations were not found.");
  }
  const locationById = Object.fromEntries(locations.map((l) => [l.id, l]));

  let fromClinicId: string | null = null;

  if (input.asClinicTransfer) {
    if (!input.issuerClinicId) {
      throw new Error("Clinic transfer requires an issuing clinic.");
    }
    if (request) {
      throw new Error("Clinic transfers are not tied to logistics requests.");
    }
    const fromClinic = await prisma.clinic.findFirst({
      where: { id: input.issuerClinicId, hospitalId: input.hospitalId },
    });
    if (!fromClinic) throw new Error("Source clinic not found.");
    fromClinicId = fromClinic.id;

    for (const loc of locations) {
      if (loc.kind !== "CLINIC" || loc.clinicId !== fromClinic.id) {
        throw new Error("Clinic transfer must pick from your clinic locations.");
      }
    }
    for (const item of items) {
      const allowed = clinicMayTransferItem({
        item,
        fromClinic,
        toClinic: clinic,
      });
      if (!allowed.ok) throw new Error(allowed.error);
    }
  } else if (input.asPharmacySos) {
    if (request?.channel !== "PHARMACY_SOS") {
      throw new Error("Pharmacy SOS can only fulfill Pharmacy-channel requests.");
    }
    for (const loc of locations) {
      if (loc.kind !== "CLINIC" || !loc.clinic?.isPharmacySos) {
        throw new Error("Pharmacy SOS must issue from Pharmacy clinic locations.");
      }
      if (input.issuerClinicId && loc.clinicId !== input.issuerClinicId) {
        throw new Error("Cannot issue from another clinic's locations.");
      }
    }
    for (const item of items) {
      if (item.commodityClass !== "PHARMACY") {
        throw new Error("Pharmacy SOS C2C issues pharmacy items only.");
      }
    }
    fromClinicId = input.issuerClinicId ?? locations[0]?.clinicId ?? null;
  } else {
    for (const loc of locations) {
      if (loc.kind !== "WAREHOUSE") {
        throw new Error("Logistics must issue from warehouse locations.");
      }
    }
    const mode = request ? "request" : "push";
    if (request && request.channel !== "LOGISTICS") {
      throw new Error(
        "This request is fulfilled by Pharmacy SOS, not logistics.",
      );
    }
    for (const item of items) {
      const allowed = logisticsMayIssueItemToClinic({
        item,
        clinic,
        mode,
      });
      if (!allowed.ok) throw new Error(allowed.error);
    }
  }

  for (const line of input.lines) {
    const lot = await prisma.lot.findFirst({
      where: {
        id: line.lotId,
        itemId: line.itemId,
        hospitalId: input.hospitalId,
      },
    });
    if (!lot) throw new Error("Lot does not match item.");
    await assertSourceStock(input.hospitalId, line);
  }

  // Request line coverage (single-item MVP lines, but support multi)
  if (request) {
    for (const line of input.lines) {
      const reqLine = request.lines.find((l) => l.itemId === line.itemId);
      if (!reqLine) {
        throw new Error(
          `Item ${itemById[line.itemId]?.sku ?? line.itemId} is not on this request.`,
        );
      }
      const remaining = reqLine.quantityRequested.minus(reqLine.quantityFulfilled);
      if (new Prisma.Decimal(line.quantity).greaterThan(remaining)) {
        throw new Error(
          `Issue qty exceeds remaining request for ${itemById[line.itemId].sku} (remaining ${remaining.toString()}).`,
        );
      }
    }
  }

  const kind = input.asClinicTransfer
    ? "CLINIC_TRANSFER"
    : input.asPharmacySos
      ? "PHARMACY_C2C"
      : request
        ? "REQUEST_FULFILLMENT"
        : "LOGISTICS_PUSH";

  return prisma.$transaction(async (tx) => {
    for (const line of input.lines) {
      await adjustBalance(tx, {
        hospitalId: input.hospitalId,
        locationId: line.fromLocationId,
        itemId: line.itemId,
        lotId: line.lotId,
        delta: new Prisma.Decimal(line.quantity).negated(),
      });
    }

    const transfer = await tx.transfer.create({
      data: {
        hospitalId: input.hospitalId,
        kind,
        status: "ISSUED",
        requestId: request?.id ?? null,
        fromClinicId,
        toClinicId: clinic.id,
        issuedById: input.actorId,
        notes: input.notes?.trim() || null,
        lines: {
          create: input.lines.map((line) => ({
            itemId: line.itemId,
            lotId: line.lotId,
            fromLocationId: line.fromLocationId,
            quantity: new Prisma.Decimal(line.quantity),
          })),
        },
      },
      include: {
        lines: { include: { item: true, lot: true, fromLocation: true } },
        toClinic: true,
        fromClinic: true,
      },
    });

    if (request) {
      for (const line of input.lines) {
        const reqLine = request.lines.find((l) => l.itemId === line.itemId)!;
        await tx.supplyRequestLine.update({
          where: { id: reqLine.id },
          data: {
            quantityFulfilled: reqLine.quantityFulfilled.plus(line.quantity),
          },
        });
      }

      const refreshed = await tx.supplyRequestLine.findMany({
        where: { requestId: request.id },
      });
      const allDone = refreshed.every((l) =>
        l.quantityFulfilled.greaterThanOrEqualTo(l.quantityRequested),
      );
      if (allDone) {
        await tx.supplyRequest.update({
          where: { id: request.id },
          data: { status: "FULFILLED" },
        });
      }
    }

    await writeAudit(tx, {
      hospitalId: input.hospitalId,
      actorId: input.actorId,
      action: "TRANSFER_ISSUE",
      entityType: "Transfer",
      entityId: transfer.id,
      summary: `Issued ${kind} to ${clinic.code} (${transfer.lines.length} line(s))`,
      metadata: {
        kind,
        toClinicId: clinic.id,
        requestId: request?.id ?? null,
        lines: input.lines,
      },
    });

    return transfer;
  });
}

export async function confirmTransfer(input: {
  hospitalId: string;
  actorId: string;
  transferId: string;
  toLocationId: string;
  clinicId: string;
}) {
  const transfer = await prisma.transfer.findFirst({
    where: {
      id: input.transferId,
      hospitalId: input.hospitalId,
      toClinicId: input.clinicId,
      status: "ISSUED",
    },
    include: { lines: true, toClinic: true },
  });
  if (!transfer) throw new Error("Issued transfer not found for this clinic.");

  const toLocation = await prisma.location.findFirst({
    where: {
      id: input.toLocationId,
      hospitalId: input.hospitalId,
      clinicId: input.clinicId,
      kind: "CLINIC",
    },
  });
  if (!toLocation) {
    throw new Error("Confirm into a storage location that belongs to your clinic.");
  }

  return prisma.$transaction(async (tx) => {
    for (const line of transfer.lines) {
      await adjustBalance(tx, {
        hospitalId: input.hospitalId,
        locationId: toLocation.id,
        itemId: line.itemId,
        lotId: line.lotId,
        delta: line.quantity,
      });
    }

    const confirmed = await tx.transfer.update({
      where: { id: transfer.id },
      data: {
        status: "CONFIRMED",
        toLocationId: toLocation.id,
        confirmedById: input.actorId,
        confirmedAt: new Date(),
      },
      include: {
        lines: { include: { item: true, lot: true } },
        toLocation: true,
      },
    });

    await writeAudit(tx, {
      hospitalId: input.hospitalId,
      actorId: input.actorId,
      action: "TRANSFER_CONFIRM",
      entityType: "Transfer",
      entityId: transfer.id,
      summary: `Confirmed receipt into ${toLocation.code} for ${transfer.toClinic.code}`,
      metadata: { toLocationId: toLocation.id },
    });

    return confirmed;
  });
}
