"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { receiveInbound } from "@/lib/receive";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { canAccessLogistics } from "@/lib/roles";

export async function receiveAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireSession();
  if (!canAccessLogistics(user.role) || user.role === "AUDITOR") {
    return fail("You do not have permission to receive.");
  }

  const itemId = String(formData.get("itemId") ?? "");
  const locationId = String(formData.get("locationId") ?? "");
  const lotNumber = String(formData.get("lotNumber") ?? "");
  const expiresOn = String(formData.get("expiresOn") ?? "") || null;
  const quantity = Number(formData.get("quantity"));
  const acknowledgeTempWarning = formData.get("acknowledgeTempWarning") === "on";

  try {
    const result = await receiveInbound({
      hospitalId: user.hospitalId,
      actorId: user.id,
      itemId,
      locationId,
      lotNumber,
      expiresOn,
      quantity,
      acknowledgeTempWarning,
    });
    revalidatePath("/logistics");
    revalidatePath("/logistics/receive");
    revalidatePath("/logistics/on-hand");
    return ok(
      `Received ${quantity} ${result.item.uom} of ${result.item.sku} lot ${result.lot.lotNumber} into ${result.location.code}.`,
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Receive failed.";
    const needsTempAck =
      message.includes("Ambient item into") ||
      message.includes("Confirm only if intentional");
    return fail(message, { needsTempAck });
  }
}
