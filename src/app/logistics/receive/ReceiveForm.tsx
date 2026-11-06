"use client";

import { useActionState, useEffect, useState } from "react";
import { receiveAction } from "./actions";
import { Flash } from "@/components/forms/Flash";
import { ItemCombobox } from "@/components/forms/ItemCombobox";
import type { ActionResult } from "@/lib/action-result";
import type { SearchableItem } from "@/lib/item-search";

type LocOption = { id: string; label: string; tempZone?: string };
type ItemOption = SearchableItem & { requiresCold?: boolean };

export function ReceiveForm({
  items,
  locations,
}: {
  items: ItemOption[];
  locations: LocOption[];
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    receiveAction,
    null,
  );
  const [showAck, setShowAck] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedLocId, setSelectedLocId] = useState(locations[0]?.id ?? "");

  useEffect(() => {
    if (state?.ok === false && state.needsTempAck) {
      setShowAck(true);
    }
    if (state?.ok) {
      setShowAck(false);
    }
  }, [state]);

  const selectedItem = items.find((i) => i.id === selectedItemId);
  const selectedLoc = locations.find((l) => l.id === selectedLocId);

  return (
    <form
      action={formAction}
      className="ops-form"
      onSubmit={(e) => {
        if (!selectedItemId) {
          e.preventDefault();
        }
      }}
    >
      {state && (
        <Flash
          kind={state.ok ? "ok" : state.needsTempAck ? "warn" : "fail"}
          message={state.message}
        />
      )}

      <div className="field">
        <label htmlFor="itemId">Item</label>
        <ItemCombobox
          id="itemId"
          name="itemId"
          items={items}
          value={selectedItemId}
          required
          onChange={(id) => setSelectedItemId(id)}
        />
        <p className="field-hint">Type to search by SKU, name, NDC, or UPC.</p>
        {selectedItem?.requiresCold && (
          <p className="field-hint cold">
            Cold-chain item — refrigerated/frozen location required
          </p>
        )}
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="lotNumber">Lot number</label>
          <input id="lotNumber" name="lotNumber" required autoComplete="off" spellCheck={false} />
        </div>
        <div className="field">
          <label htmlFor="expiresOn">Expiry (optional)</label>
          <input id="expiresOn" name="expiresOn" type="date" />
        </div>
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
          <label htmlFor="locationId">Warehouse location</label>
          <select
            id="locationId"
            name="locationId"
            required
            value={selectedLocId}
            onChange={(e) => setSelectedLocId(e.target.value)}
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.label}
              </option>
            ))}
          </select>
          {selectedLoc?.tempZone && (
            <p className="field-hint">Zone: {selectedLoc.tempZone}</p>
          )}
        </div>
      </div>

      {showAck && (
        <label className="check-row">
          <input type="checkbox" name="acknowledgeTempWarning" />
          <span>I acknowledge placing an ambient item into a cold-chain location.</span>
        </label>
      )}

      <button
        type="submit"
        className="btn-primary"
        disabled={pending || !selectedItemId}
      >
        {pending ? "Receiving…" : "Receive to location"}
      </button>
    </form>
  );
}
