"use client";

import { useActionState } from "react";
import { confirmAction } from "./actions";
import { Flash } from "@/components/forms/Flash";
import type { ActionResult } from "@/lib/action-result";

type TransferOpt = { id: string; label: string };
type LocationOpt = { id: string; label: string };

export function ConfirmForm({
  transfers,
  locations,
}: {
  transfers: TransferOpt[];
  locations: LocationOpt[];
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    confirmAction,
    null,
  );

  if (!transfers.length) {
    return <p className="empty">No issued transfers waiting for confirmation.</p>;
  }

  return (
    <form action={formAction} className="ops-form">
      {state && <Flash kind={state.ok ? "ok" : "fail"} message={state.message} />}

      <div className="field">
        <label htmlFor="transferId">Issued transfer</label>
        <select
          id="transferId"
          name="transferId"
          required
          defaultValue={transfers[0]?.id}
        >
          {transfers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="toLocationId">Put away to clinic location</label>
        <select
          id="toLocationId"
          name="toLocationId"
          required
          defaultValue={locations[0]?.id}
        >
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.label}
            </option>
          ))}
        </select>
      </div>

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Confirming…" : "Confirm receipt"}
      </button>
    </form>
  );
}
