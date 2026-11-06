import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { adjustBalance } from "@/lib/inventory";
import { checkTempZoneCompatibility } from "@/lib/temp-zone";
import { applyInboundReceiveProgress } from "@/lib/inbound";

export type ReceiveInput = {
  hospitalId: string;
  actorId: string;
  itemId: string;
  lotNumber: string;
  expiresOn?: string | null;
  /** Actual quantity received onto the location. */
  quantity: number;
  locationId: string;
  acknowledgeTempWarning?: boolean;
  /** Optional expected qty (ASN/PO stub). Variance audited when set. */
  expectedQuantity?: number | null;
  /** Required when expected is set and differs from actual. */
  varianceNote?: string | null;
  /** Optional inbound PO/ASN line to receive against. */
  inboundLineId?: string | null;
};

export async function receiveInbound(input: ReceiveInput) {
  if (!input.lotNumber.trim()) {
    throw new Error("Lot number is required.");
  }
  if (!(input.quantity > 0)) {
    throw new Error("Actual quantity must be greater than zero.");
  }

  let inboundLine:
    | {
        id: string;
        shipmentId: string;
        itemId: string;
        quantityExpected: Prisma.Decimal;
        quantityReceived: Prisma.Decimal;
        shipment: { referenceNumber: string; status: string };
      }
    | null = null;

  if (input.inboundLineId) {
    inboundLine = await prisma.inboundShipmentLine.findFirst({
      where: {
        id: input.inboundLineId,
        shipment: { hospitalId: input.hospitalId, status: "OPEN" },
      },
      include: { shipment: true },
    });
    if (!inboundLine) throw new Error("Open inbound line not found.");
    if (inboundLine.itemId !== input.itemId) {
      throw new Error("Selected item does not match the inbound line.");
    }
  }

  let expected: number | null = null;
  if (inboundLine && (input.expectedQuantity == null || Number.isNaN(Number(input.expectedQuantity)))) {
    const remaining = inboundLine.quantityExpected.minus(inboundLine.quantityReceived);
    expected = Number(remaining);
  } else if (
    input.expectedQuantity != null &&
    !(typeof input.expectedQuantity === "number" && Number.isNaN(input.expectedQuantity))
  ) {
    expected = Number(input.expectedQuantity);
  }

  if (expected != null) {
    if (!(expected > 0) || Number.isNaN(expected)) {
      throw new Error("Expected quantity must be greater than zero when provided.");
    }
    const variance = input.quantity - expected;
    if (variance !== 0 && !input.varianceNote?.trim()) {
      throw new Error(
        "Enter a variance note when actual quantity differs from expected (short or over).",
      );
    }
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

  const variance =
    expected == null ? null : new Prisma.Decimal(input.quantity).minus(expected);
  const varianceKind =
    variance == null || variance.isZero()
      ? "MATCH"
      : variance.lessThan(0)
        ? "SHORT"
        : "OVER";

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

    if (inboundLine) {
      await applyInboundReceiveProgress({
        hospitalId: input.hospitalId,
        actorId: input.actorId,
        shipmentId: inboundLine.shipmentId,
        lineId: inboundLine.id,
        quantityReceived: input.quantity,
        tx,
      });
    }

    const action =
      varianceKind === "SHORT"
        ? "RECEIVE_SHORT"
        : varianceKind === "OVER"
          ? "RECEIVE_OVER"
          : "RECEIVE";

    const varianceText =
      varianceKind === "MATCH" || expected == null
        ? ""
        : ` · ${varianceKind} expected ${expected} / actual ${input.quantity}`;

    const inboundText = inboundLine
      ? ` against ${inboundLine.shipment.referenceNumber}`
      : "";

    await writeAudit(tx, {
      hospitalId: input.hospitalId,
      actorId: input.actorId,
      action,
      entityType: "Lot",
      entityId: lot.id,
      summary: `Received ${input.quantity} ${item.uom} of ${item.sku} lot ${lot.lotNumber} into ${location.code}${inboundText}${varianceText}`,
      metadata: {
        itemId: item.id,
        locationId: location.id,
        quantity: input.quantity,
        expectedQuantity: expected,
        variance: variance?.toString() ?? null,
        varianceKind,
        varianceNote: input.varianceNote?.trim() || null,
        inboundLineId: inboundLine?.id ?? null,
        inboundShipmentId: inboundLine?.shipmentId ?? null,
        tempZone: location.tempZone,
        warning: zoneCheck.warning ?? null,
      },
    });

    return {
      lot,
      item,
      location,
      varianceKind,
      expected,
      variance,
      inboundRef: inboundLine?.shipment.referenceNumber ?? null,
    };
  });
}
