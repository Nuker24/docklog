import { Prisma } from "@prisma/client";
import type { Prisma as PrismaNS } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";

type Tx = PrismaNS.TransactionClient;

export async function createInboundShipment(input: {
  hospitalId: string;
  actorId: string;
  referenceNumber: string;
  vendorName?: string;
  notes?: string;
  lines: { itemId: string; quantityExpected: number }[];
}) {
  const ref = input.referenceNumber.trim();
  if (!ref) throw new Error("PO / ASN reference is required.");
  if (!input.lines.length) throw new Error("Add at least one expected line.");
  for (const line of input.lines) {
    if (!(line.quantityExpected > 0)) {
      throw new Error("Each expected quantity must be greater than zero.");
    }
  }

  const itemIds = [...new Set(input.lines.map((l) => l.itemId))];
  const items = await prisma.item.findMany({
    where: { id: { in: itemIds }, hospitalId: input.hospitalId, isActive: true },
  });
  if (items.length !== itemIds.length) {
    throw new Error("One or more items were not found.");
  }

  return prisma.$transaction(async (tx) => {
    const shipment = await tx.inboundShipment.create({
      data: {
        hospitalId: input.hospitalId,
        referenceNumber: ref,
        vendorName: input.vendorName?.trim() || null,
        notes: input.notes?.trim() || null,
        createdById: input.actorId,
        status: "OPEN",
        lines: {
          create: input.lines.map((line) => ({
            itemId: line.itemId,
            quantityExpected: new Prisma.Decimal(line.quantityExpected),
          })),
        },
      },
      include: { lines: { include: { item: true } } },
    });

    await writeAudit(tx, {
      hospitalId: input.hospitalId,
      actorId: input.actorId,
      action: "INBOUND_CREATE",
      entityType: "InboundShipment",
      entityId: shipment.id,
      summary: `Created inbound ${shipment.referenceNumber} with ${shipment.lines.length} line(s)`,
      metadata: {
        referenceNumber: shipment.referenceNumber,
        vendorName: shipment.vendorName,
      },
    });

    return shipment;
  });
}

export async function applyInboundReceiveProgress(input: {
  hospitalId: string;
  actorId: string;
  shipmentId: string;
  lineId: string;
  quantityReceived: number;
  tx?: Tx;
}) {
  const run = async (tx: Tx) => {
    const line = await tx.inboundShipmentLine.findFirst({
      where: {
        id: input.lineId,
        shipment: { id: input.shipmentId, hospitalId: input.hospitalId },
      },
      include: { shipment: true, item: true },
    });
    if (!line) throw new Error("Inbound line not found.");
    if (line.shipment.status !== "OPEN") {
      throw new Error("Inbound shipment is not open.");
    }

    const next = line.quantityReceived.plus(input.quantityReceived);
    await tx.inboundShipmentLine.update({
      where: { id: line.id },
      data: { quantityReceived: next },
    });

    const allLines = await tx.inboundShipmentLine.findMany({
      where: { shipmentId: line.shipmentId },
    });
    const allDone = allLines.every((l) =>
      l.quantityReceived.greaterThanOrEqualTo(l.quantityExpected),
    );
    if (allDone) {
      await tx.inboundShipment.update({
        where: { id: line.shipmentId },
        data: { status: "CLOSED" },
      });
    }

    return line;
  };

  if (input.tx) return run(input.tx);
  return prisma.$transaction(run);
}
