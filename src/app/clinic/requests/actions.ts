"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { createSupplyRequest, cancelSupplyRequest } from "@/lib/requests";
import { issueTransfer } from "@/lib/transfers";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { canAccessClinic } from "@/lib/roles";

export async function createRequestAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireSession();
  if (!canAccessClinic(user.role) || user.role === "AUDITOR") {
    return fail("You do not have permission to create requests.");
  }
  if (!user.clinicId) {
    return fail("Your user is not assigned to a clinic.");
  }

  try {
    const request = await createSupplyRequest({
      hospitalId: user.hospitalId,
      clinicId: user.clinicId,
      actorId: user.id,
      itemId: String(formData.get("itemId") ?? ""),
      quantity: Number(formData.get("quantity")),
      notes: String(formData.get("notes") ?? ""),
    });
    revalidatePath("/clinic/requests");
    revalidatePath("/logistics/issue");
    const channel =
      request.channel === "PHARMACY_SOS" ? "Pharmacy SOS" : "logistics";
    return ok(
      `Request submitted to ${channel} for ${request.lines[0]?.item.sku}.`,
    );
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not create request.");
  }
}

export async function cancelRequestAction(formData: FormData): Promise<void> {
  const user = await requireSession();
  if (!user.clinicId) return;
  await cancelSupplyRequest({
    hospitalId: user.hospitalId,
    requestId: String(formData.get("requestId") ?? ""),
    actorId: user.id,
    clinicId: user.clinicId,
  });
  revalidatePath("/clinic/requests");
  revalidatePath("/logistics/issue");
}

export async function pharmacyFulfillAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireSession();
  if (!canAccessClinic(user.role) || !user.clinicId) {
    return fail("Pharmacy SOS fulfill requires a clinic assignment.");
  }

  try {
    const transfer = await issueTransfer({
      hospitalId: user.hospitalId,
      actorId: user.id,
      toClinicId: String(formData.get("toClinicId") ?? ""),
      requestId: String(formData.get("requestId") ?? ""),
      asPharmacySos: true,
      issuerClinicId: user.clinicId,
      lines: [
        {
          itemId: String(formData.get("itemId") ?? ""),
          lotId: String(formData.get("lotId") ?? ""),
          fromLocationId: String(formData.get("fromLocationId") ?? ""),
          quantity: Number(formData.get("quantity")),
        },
      ],
    });
    revalidatePath("/clinic/requests");
    revalidatePath("/clinic/on-hand");
    revalidatePath("/clinic/confirm");
    return ok(
      `Issued Pharmacy C2C transfer to ${transfer.toClinic.code}. Awaiting clinic confirm.`,
    );
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Fulfill failed.");
  }
}
