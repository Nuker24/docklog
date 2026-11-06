"use client";

import { useActionState } from "react";
import { createRequestAction } from "./actions";
import { Flash } from "@/components/forms/Flash";
import type { ActionResult } from "@/lib/action-result";

type ItemOpt = {
  id: string;
  label: string;
  channel: "LOGISTICS" | "PHARMACY_SOS";
};

export function RequestForm({ items }: { items: ItemOpt[] }) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    createRequestAction,
    null,
  );

  return (
    <form action={formAction} className="ops-form">
      {state && <Flash kind={state.ok ? "ok" : "fail"} message={state.message} />}

      <div className="field">
        <label htmlFor="itemId">Item</label>
        <select id="itemId" name="itemId" required defaultValue={items[0]?.id}>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
              {item.channel === "PHARMACY_SOS" ? " → Pharmacy SOS" : " → Logistics"}
            </option>
          ))}
        </select>
        <p className="field-hint">
          Expendable medical supply routes to logistics. Pharmacy items route to
          Pharmacy SOS (C2C).
        </p>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="quantity">Quantity</label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            min="0.001"
            step="any"
            required
            defaultValue={1}
          />
        </div>
        <div className="field">
          <label htmlFor="notes">Notes (optional)</label>
          <input id="notes" name="notes" />
        </div>
      </div>

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Submitting…" : "Submit request"}
      </button>
    </form>
  );
}
