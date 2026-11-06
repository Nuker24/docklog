"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { canAccessLogistics } from "@/lib/roles";
import { confirmRecallTask, createRecallCampaign } from "@/lib/recalls";
import { fail, ok, type ActionResult } from "@/lib/action-result";

export async function createRecallAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireSession();
  if (!canAccessLogistics(user.role) || user.role === "AUDITOR") {
    return fail("You do not have permission to open recalls.");
  }

  try {
    const campaign = await createRecallCampaign({
      hospitalId: user.hospitalId,
      actorId: user.id,
      reason: String(formData.get("reason") ?? ""),
      referenceNumber: String(formData.get("referenceNumber") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      lotNumber: String(formData.get("lotNumber") ?? "") || null,
      itemId: String(formData.get("itemId") ?? "") || null,
      ndc: String(formData.get("ndc") ?? "") || null,
    });
    revalidatePath("/logistics/recalls");
    revalidatePath("/clinic/recalls");
    revalidatePath("/logistics/audit");
    revalidatePath("/logistics/issue");
    return ok(
      `Recall opened (${campaign.tasks.length} clinic return task(s)). Lot held from issue.`,
    );
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not open recall.");
  }
}

export async function confirmRecallAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireSession();
  if (!canAccessLogistics(user.role) || user.role === "AUDITOR") {
    return fail("You do not have permission to confirm recall returns.");
  }

  try {
    await confirmRecallTask({
      hospitalId: user.hospitalId,
      actorId: user.id,
      taskId: String(formData.get("taskId") ?? ""),
      toLocationId: String(formData.get("toLocationId") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    });
    revalidatePath("/logistics/recalls");
    revalidatePath("/clinic/recalls");
    revalidatePath("/logistics/on-hand");
    revalidatePath("/logistics/audit");
    return ok("Recall return confirmed into warehouse.");
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Confirm failed.");
  }
}
