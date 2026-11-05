import type { TempZone } from "@prisma/client";

export type TempZoneCheck =
  | { ok: true; warning?: string }
  | { ok: false; error: string };

const COLD_ZONES: TempZone[] = ["REFRIGERATED", "FROZEN"];

/** Cold-required items must land in refrigerated/frozen. Ambient into cold warns. */
export function checkTempZoneCompatibility(input: {
  requiresCold: boolean;
  locationTempZone: TempZone;
  locationLabel: string;
  acknowledgeWarning?: boolean;
}): TempZoneCheck {
  const { requiresCold, locationTempZone, locationLabel, acknowledgeWarning } =
    input;

  if (requiresCold && !COLD_ZONES.includes(locationTempZone)) {
    return {
      ok: false,
      error: `Cold-chain item cannot be placed in ${locationLabel} (${locationTempZone.replaceAll("_", " ").toLowerCase()}). Use a refrigerated or frozen location.`,
    };
  }

  if (!requiresCold && COLD_ZONES.includes(locationTempZone)) {
    const warning = `Ambient item into ${locationLabel} (${locationTempZone.replaceAll("_", " ").toLowerCase()}). Confirm only if intentional.`;
    if (!acknowledgeWarning) {
      return { ok: false, error: warning };
    }
    return { ok: true, warning };
  }

  return { ok: true };
}

export function tempZoneLabel(zone: TempZone): string {
  switch (zone) {
    case "AMBIENT":
      return "Ambient";
    case "REFRIGERATED":
      return "Refrigerated 2–8°C";
    case "FROZEN":
      return "Frozen";
    case "CONTROLLED_ROOM":
      return "Controlled room";
    default:
      return zone;
  }
}
