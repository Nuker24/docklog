import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { requestChannelForItem } from "@/lib/commodity-rules";

export async function createSupplyRequest(input: {
  hospitalId: string;
  clinicId: string;
  actorId: string;
  itemId: string;
  quantity: number;
  notes?: string;
}) {
  if (!(input.quantity > 0)) {
    throw new Error("Quantity must be greater than zero.");
  }

  const [clinic, item] = await Promise.all([
    prisma.clinic.findFirst({
      where: { id: input.clinicId, hospitalId: input.hospitalId },
    }),
    prisma.item.findFirst({
      where: { id: input.itemId, hospitalId: input.hospitalId, isActive: true },
    }),
  ]);

  if (!clinic) throw new Error("Clinic not found.");
  if (!item) throw new Error("Item not found.");

  const channel = requestChannelForItem(item.commodityClass);

  if (channel === "PHARMACY_SOS" && clinic.isPharmacySos) {
    throw new Error(
      "Pharmacy SOS is the drug source — create pharmacy requests from consuming clinics, not Pharmacy itself.",
    );
  }

  return prisma.$transaction(async (tx) => {
    const request = await tx.supplyRequest.create({
      data: {
        hospitalId: input.hospitalId,
        requestingClinicId: clinic.id,
        channel,
        status: "OPEN",
        notes: input.notes?.trim() || null,
        requestedById: input.actorId,
        lines: {
          create: {
            itemId: item.id,
            quantityRequested: new Prisma.Decimal(input.quantity),
          },
        },
      },
      include: {
        lines: { include: { item: true } },
        requestingClinic: true,
      },
    });

    await writeAudit(tx, {
      hospitalId: input.hospitalId,
      actorId: input.actorId,
      action: "REQUEST_CREATE",
      entityType: "SupplyRequest",
      entityId: request.id,
      summary: `${clinic.code} requested ${input.quantity} ${item.uom} of ${item.sku} via ${channel}`,
      metadata: { channel, itemId: item.id, quantity: input.quantity },
    });

    return request;
  });
}

export async function cancelSupplyRequest(input: {
  hospitalId: string;
  requestId: string;
  actorId: string;
  clinicId?: string | null;
}) {
  const request = await prisma.supplyRequest.findFirst({
    where: {
      id: input.requestId,
      hospitalId: input.hospitalId,
      ...(input.clinicId
        ? { requestingClinicId: input.clinicId }
        : {}),
    },
  });
  if (!request) throw new Error("Request not found.");
  if (request.status !== "OPEN") {
    throw new Error("Only open requests can be cancelled.");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.supplyRequest.update({
      where: { id: request.id },
      data: { status: "CANCELLED" },
    });
    await writeAudit(tx, {
      hospitalId: input.hospitalId,
      actorId: input.actorId,
      action: "REQUEST_CANCEL",
      entityType: "SupplyRequest",
      entityId: request.id,
      summary: `Cancelled supply request ${request.id}`,
    });
    return updated;
  });
}
