"use client";

import { useActionState, useState } from "react";
import { createRequestAction } from "./actions";
import { Flash } from "@/components/forms/Flash";
import { ItemCombobox } from "@/components/forms/ItemCombobox";
import type { ActionResult } from "@/lib/action-result";
import type { SearchableItem } from "@/lib/item-search";

type ItemOpt = SearchableItem & {
  channel: "LOGISTICS" | "PHARMACY_SOS";
};

export function RequestForm({ items }: { items: ItemOpt[] }) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    createRequestAction,
    null,
  );
  const [itemId, setItemId] = useState("");
  const selected = items.find((i) => i.id === itemId);

  return (
    <form
      action={formAction}
      className="ops-form"
      onSubmit={(e) => {
        if (!itemId) e.preventDefault();
      }}
    >
      {state && <Flash kind={state.ok ? "ok" : "fail"} message={state.message} />}

      <div className="field">
        <label htmlFor="itemId">Item</label>
        <ItemCombobox
          id="itemId"
          name="itemId"
          items={items}
          value={itemId}
          required
          onChange={(id) => setItemId(id)}
        />
        <p className="field-hint">
          Search by SKU, name, NDC, or UPC. Expendable medical supply routes to
          logistics; pharmacy items route to Pharmacy SOS (C2C).
        </p>
        {selected?.channel && (
          <p className="field-hint">
            Fulfillment channel:{" "}
            <strong>
              {selected.channel === "PHARMACY_SOS"
                ? "Pharmacy SOS"
                : "Logistics"}
            </strong>
          </p>
        )}
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

      <button
        type="submit"
        className="btn-primary"
        disabled={pending || !itemId}
      >
        {pending ? "Submitting…" : "Submit request"}
      </button>
    </form>
  );
}
