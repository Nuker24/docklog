import type { Clinic, CommodityClass, Item } from "@prisma/client";

/** Pharmacy items go to Pharmacy SOS; expendable medical supply to logistics. */
export function requestChannelForItem(commodityClass: CommodityClass) {
  return commodityClass === "PHARMACY" ? "PHARMACY_SOS" : "LOGISTICS";
}

/**
 * Logistics may issue expendable supply to any clinic.
 * Logistics may also supply Pharmacy (any commodity Pharmacy needs).
 * Logistics may not issue pharmacy drugs to non-Pharmacy clinics.
 */
export function logisticsMayIssueItemToClinic(input: {
  item: Pick<Item, "commodityClass">;
  clinic: Pick<Clinic, "isPharmacySos" | "logisticsPushEnabled" | "name">;
  mode: "push" | "request";
}): { ok: true } | { ok: false; error: string } {
  const { item, clinic, mode } = input;

  if (mode === "push" && !clinic.logisticsPushEnabled) {
    return {
      ok: false,
      error: `${clinic.name} has logistics push disabled — clinic must request supply.`,
    };
  }

  if (item.commodityClass === "PHARMACY" && !clinic.isPharmacySos) {
    return {
      ok: false,
      error:
        "Logistics cannot issue pharmacy items to clinics. Clinics request drugs from Pharmacy SOS (C2C).",
    };
  }

  if (
    item.commodityClass === "EXPENDABLE_MEDICAL_SUPPLY" ||
    clinic.isPharmacySos
  ) {
    return { ok: true };
  }

  return { ok: false, error: "Issue not allowed for this item/clinic." };
}

/**
 * Clinic→clinic: expendable may move between any clinics.
 * Pharmacy drugs may only leave a Pharmacy SOS clinic (still SOS for drugs).
 */
export function clinicMayTransferItem(input: {
  item: Pick<Item, "commodityClass" | "sku">;
  fromClinic: Pick<Clinic, "isPharmacySos" | "name" | "id">;
  toClinic: Pick<Clinic, "id" | "name">;
}): { ok: true } | { ok: false; error: string } {
  if (input.fromClinic.id === input.toClinic.id) {
    return { ok: false, error: "Choose a different destination clinic." };
  }
  if (input.item.commodityClass === "PHARMACY" && !input.fromClinic.isPharmacySos) {
    return {
      ok: false,
      error: `Pharmacy items must transfer from Pharmacy SOS, not ${input.fromClinic.name}.`,
    };
  }
  return { ok: true };
}
