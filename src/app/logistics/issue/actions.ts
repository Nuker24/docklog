"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { issueTransfer } from "@/lib/transfers";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { canAccessLogistics } from "@/lib/roles";

export async function issueAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireSession();
  if (!canAccessLogistics(user.role) || user.role === "AUDITOR") {
    return fail("You do not have permission to issue.");
  }

  const toClinicId = String(formData.get("toClinicId") ?? "");
  const requestId = String(formData.get("requestId") ?? "") || null;
  const itemId = String(formData.get("itemId") ?? "");
  const lotId = String(formData.get("lotId") ?? "");
  const fromLocationId = String(formData.get("fromLocationId") ?? "");
  const quantity = Number(formData.get("quantity"));
  const notes = String(formData.get("notes") ?? "");

  try {
    const transfer = await issueTransfer({
      hospitalId: user.hospitalId,
      actorId: user.id,
      toClinicId,
      requestId,
      notes,
      lines: [{ itemId, lotId, fromLocationId, quantity }],
    });
    revalidatePath("/logistics");
    revalidatePath("/logistics/issue");
    revalidatePath("/logistics/on-hand");
    revalidatePath("/clinic");
    revalidatePath("/clinic/confirm");
    revalidatePath("/clinic/requests");
    return ok(
      `Issued transfer to ${transfer.toClinic.code}. Clinic must confirm receipt.`,
    );
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Issue failed.");
  }
}
