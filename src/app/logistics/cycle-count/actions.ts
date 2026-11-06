"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { applyCycleCountLine } from "@/lib/cycle-count";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { canAccessLogistics } from "@/lib/roles";

export async function cycleCountAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireSession();
  if (!canAccessLogistics(user.role) || user.role === "AUDITOR") {
    return fail("You do not have permission to cycle count.");
  }

  try {
    const result = await applyCycleCountLine({
      hospitalId: user.hospitalId,
      actorId: user.id,
      locationId: String(formData.get("locationId") ?? ""),
      itemId: String(formData.get("itemId") ?? ""),
      lotId: String(formData.get("lotId") ?? ""),
      countedQty: Number(formData.get("countedQty")),
      note: String(formData.get("note") ?? ""),
    });

    revalidatePath("/logistics/cycle-count");
    revalidatePath("/logistics/on-hand");
    revalidatePath("/logistics");

    if (!result.adjusted) {
      return ok(
        `Count matches system for ${result.item.sku} lot ${result.lot.lotNumber} at ${result.location.code} (${result.systemQty.toString()}). No adjustment.`,
      );
    }

    return ok(
      `Adjusted ${result.item.sku} lot ${result.lot.lotNumber} at ${result.location.code}: ${result.systemQty.toString()} → ${result.counted.toString()} (Δ ${result.delta.toString()}).`,
    );
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Cycle count failed.");
  }
}
