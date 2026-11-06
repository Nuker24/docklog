"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { issueTransfer } from "@/lib/transfers";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { canAccessClinic } from "@/lib/roles";

export async function clinicTransferAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireSession();
  if (!canAccessClinic(user.role) || user.role === "AUDITOR" || !user.clinicId) {
    return fail("You do not have permission to transfer clinic stock.");
  }

  try {
    const transfer = await issueTransfer({
      hospitalId: user.hospitalId,
      actorId: user.id,
      toClinicId: String(formData.get("toClinicId") ?? ""),
      asClinicTransfer: true,
      issuerClinicId: user.clinicId,
      notes: String(formData.get("notes") ?? ""),
      lines: [
        {
          itemId: String(formData.get("itemId") ?? ""),
          lotId: String(formData.get("lotId") ?? ""),
          fromLocationId: String(formData.get("fromLocationId") ?? ""),
          quantity: Number(formData.get("quantity")),
        },
      ],
    });
    revalidatePath("/clinic/transfer");
    revalidatePath("/clinic/on-hand");
    revalidatePath("/clinic/confirm");
    revalidatePath("/logistics/transfers");
    return ok(
      `Clinic transfer issued to ${transfer.toClinic.code}. Print slip: /print/transfer/${transfer.id}`,
    );
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Transfer failed.");
  }
}
