"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
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
  const [expectedQty, setExpectedQty] = useState("");
  const [actualQty, setActualQty] = useState("1");

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

  const variance = useMemo(() => {
    const exp = expectedQty.trim() === "" ? null : Number(expectedQty);
    const act = Number(actualQty);
    if (exp == null || Number.isNaN(exp) || Number.isNaN(act)) return null;
    return act - exp;
  }, [expectedQty, actualQty]);

  const needsVarianceNote = variance != null && variance !== 0;

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
          <label htmlFor="expectedQuantity">Expected qty (optional)</label>
          <input
            id="expectedQuantity"
            name="expectedQuantity"
            type="number"
            min="0.001"
            step="any"
            value={expectedQty}
            onChange={(e) => setExpectedQty(e.target.value)}
            placeholder="ASN / packing slip"
          />
          <p className="field-hint">
            Leave blank for ad-hoc receive. If set, short/over requires a note.
          </p>
        </div>
        <div className="field">
          <label htmlFor="quantity">Actual qty received</label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            min="0.001"
            step="any"
            required
            value={actualQty}
            onChange={(e) => setActualQty(e.target.value)}
          />
        </div>
      </div>

      {variance != null && (
        <p
          className={`field-hint${needsVarianceNote ? (variance < 0 ? " cold" : "") : ""}`}
          style={
            needsVarianceNote
              ? { color: variance < 0 ? "var(--danger)" : "var(--teal-deep)" }
              : undefined
          }
        >
          {variance === 0
            ? "Actual matches expected."
            : variance < 0
              ? `Short by ${Math.abs(variance)} — document reason below.`
              : `Over by ${variance} — document reason below.`}
        </p>
      )}

      {needsVarianceNote && (
        <div className="field">
          <label htmlFor="varianceNote">Variance note</label>
          <input
            id="varianceNote"
            name="varianceNote"
            required
            placeholder="e.g. carton damaged / vendor short-shipped"
          />
        </div>
      )}

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
