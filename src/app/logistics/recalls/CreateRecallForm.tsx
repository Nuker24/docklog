"use client";

import { useActionState, useState } from "react";
import { createRecallAction } from "./actions";
import { Flash } from "@/components/forms/Flash";
import { ItemCombobox } from "@/components/forms/ItemCombobox";
import type { ActionResult } from "@/lib/action-result";
import type { SearchableItem } from "@/lib/item-search";

export function CreateRecallForm({ items }: { items: SearchableItem[] }) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    createRecallAction,
    null,
  );
  const [itemId, setItemId] = useState("");

  return (
    <form action={formAction} className="ops-form">
      {state && <Flash kind={state.ok ? "ok" : "fail"} message={state.message} />}

      <div className="field-row">
        <div className="field">
          <label htmlFor="lotNumber">Lot number</label>
          <input
            id="lotNumber"
            name="lotNumber"
            autoComplete="off"
            spellCheck={false}
            placeholder="e.g. GZ-2026-088"
          />
          <p className="field-hint">Primary target. Leave blank to recall all lots for item/NDC.</p>
        </div>
        <div className="field">
          <label htmlFor="referenceNumber">External ref (optional)</label>
          <input
            id="referenceNumber"
            name="referenceNumber"
            placeholder="FDA / vendor recall #"
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="itemId">Item (optional narrow)</label>
        <ItemCombobox
          id="itemId"
          name="itemId"
          items={items}
          value={itemId}
          onChange={setItemId}
        />
      </div>

      <div className="field">
        <label htmlFor="ndc">NDC (optional)</label>
        <input id="ndc" name="ndc" autoComplete="off" spellCheck={false} />
      </div>

      <div className="field">
        <label htmlFor="reason">Reason</label>
        <input id="reason" name="reason" required placeholder="Contamination / labeling error…" />
      </div>

      <div className="field">
        <label htmlFor="notes">Notes (optional)</label>
        <input id="notes" name="notes" />
      </div>

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Opening…" : "Open recall & hold lot"}
      </button>
    </form>
  );
}
