"use client";

import { useActionState, useState } from "react";
import { createInboundAction } from "./actions";
import { Flash } from "@/components/forms/Flash";
import { ItemCombobox } from "@/components/forms/ItemCombobox";
import type { ActionResult } from "@/lib/action-result";
import type { SearchableItem } from "@/lib/item-search";

export function CreateInboundForm({ items }: { items: SearchableItem[] }) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    createInboundAction,
    null,
  );
  const [itemId, setItemId] = useState("");

  return (
    <form
      action={formAction}
      className="ops-form"
      onSubmit={(e) => {
        if (!itemId) e.preventDefault();
      }}
    >
      {state && <Flash kind={state.ok ? "ok" : "fail"} message={state.message} />}

      <div className="field-row">
        <div className="field">
          <label htmlFor="referenceNumber">PO / ASN reference</label>
          <input
            id="referenceNumber"
            name="referenceNumber"
            required
            autoComplete="off"
            spellCheck={false}
            placeholder="PO-2026-0412"
          />
        </div>
        <div className="field">
          <label htmlFor="vendorName">Vendor (optional)</label>
          <input id="vendorName" name="vendorName" placeholder="Medline / Cardinal…" />
        </div>
      </div>

      <div className="field">
        <label htmlFor="itemId">Expected item</label>
        <ItemCombobox
          id="itemId"
          name="itemId"
          items={items}
          value={itemId}
          required
          onChange={(id) => setItemId(id)}
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="quantityExpected">Expected qty</label>
          <input
            id="quantityExpected"
            name="quantityExpected"
            type="number"
            min="0.001"
            step="any"
            required
            defaultValue={10}
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
        {pending ? "Creating…" : "Create inbound"}
      </button>
    </form>
  );
}
