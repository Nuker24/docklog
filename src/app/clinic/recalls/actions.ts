"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { canAccessClinic } from "@/lib/roles";
import { markRecallTaskReturned } from "@/lib/recalls";
import { fail, ok, type ActionResult } from "@/lib/action-result";

export async function returnRecallAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireSession();
  if (!canAccessClinic(user.role) || user.role === "AUDITOR" || !user.clinicId) {
    return fail("You do not have permission to return recalled stock.");
  }

  try {
    await markRecallTaskReturned({
      hospitalId: user.hospitalId,
      actorId: user.id,
      clinicId: user.clinicId,
      taskId: String(formData.get("taskId") ?? ""),
      quantityReturned: Number(formData.get("quantityReturned")),
      notes: String(formData.get("notes") ?? ""),
    });
    revalidatePath("/clinic/recalls");
    revalidatePath("/logistics/recalls");
    revalidatePath("/logistics/audit");
    return ok("Return marked — logistics will confirm receipt.");
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Return failed.");
  }
}
