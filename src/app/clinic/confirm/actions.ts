"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { confirmTransfer } from "@/lib/transfers";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { canAccessClinic } from "@/lib/roles";

export async function confirmAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireSession();
  if (!canAccessClinic(user.role) || user.role === "AUDITOR") {
    return fail("You do not have permission to confirm.");
  }
  if (!user.clinicId) {
    return fail("Your user is not assigned to a clinic.");
  }

  try {
    const confirmed = await confirmTransfer({
      hospitalId: user.hospitalId,
      actorId: user.id,
      clinicId: user.clinicId,
      transferId: String(formData.get("transferId") ?? ""),
      toLocationId: String(formData.get("toLocationId") ?? ""),
    });
    revalidatePath("/clinic/confirm");
    revalidatePath("/clinic/on-hand");
    revalidatePath("/clinic");
    revalidatePath("/logistics/on-hand");
    return ok(
      `Confirmed into ${confirmed.toLocation?.code ?? "clinic location"}. On-hand updated.`,
    );
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Confirm failed.");
  }
}
