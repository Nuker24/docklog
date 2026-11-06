"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { createInboundShipment } from "@/lib/inbound";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { canAccessLogistics } from "@/lib/roles";

export async function createInboundAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireSession();
  if (!canAccessLogistics(user.role) || user.role === "AUDITOR") {
    return fail("You do not have permission to create inbound shipments.");
  }

  const itemId = String(formData.get("itemId") ?? "");
  const quantityExpected = Number(formData.get("quantityExpected"));

  try {
    const shipment = await createInboundShipment({
      hospitalId: user.hospitalId,
      actorId: user.id,
      referenceNumber: String(formData.get("referenceNumber") ?? ""),
      vendorName: String(formData.get("vendorName") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      lines: [{ itemId, quantityExpected }],
    });
    revalidatePath("/logistics/inbound");
    revalidatePath("/logistics/receive");
    return ok(
      `Created inbound ${shipment.referenceNumber}. Receive against it from Receive.`,
    );
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not create inbound.");
  }
}
