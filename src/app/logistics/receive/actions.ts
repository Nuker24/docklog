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
  const expectedRaw = String(formData.get("expectedQuantity") ?? "").trim();
  const expectedQuantity = expectedRaw === "" ? null : Number(expectedRaw);
  const varianceNote = String(formData.get("varianceNote") ?? "") || null;
  const inboundLineId = String(formData.get("inboundLineId") ?? "") || null;
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
      expectedQuantity,
      varianceNote,
      inboundLineId,
      acknowledgeTempWarning,
    });
    revalidatePath("/logistics");
    revalidatePath("/logistics/receive");
    revalidatePath("/logistics/on-hand");
    revalidatePath("/logistics/inbound");

    const varianceMsg =
      result.varianceKind === "SHORT"
        ? ` Short vs expected ${result.expected} (audited).`
        : result.varianceKind === "OVER"
          ? ` Over vs expected ${result.expected} (audited).`
          : "";
    const inboundMsg = result.inboundRef ? ` Against ${result.inboundRef}.` : "";

    return ok(
      `Received ${quantity} ${result.item.uom} of ${result.item.sku} lot ${result.lot.lotNumber} into ${result.location.code}.${inboundMsg}${varianceMsg}`,
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Receive failed.";
    const needsTempAck =
      message.includes("Ambient item into") ||
      message.includes("Confirm only if intentional");
    return fail(message, { needsTempAck });
  }
}
