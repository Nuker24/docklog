"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { receiveAction } from "./actions";
import { Flash } from "@/components/forms/Flash";
import { ItemCombobox } from "@/components/forms/ItemCombobox";
import type { ActionResult } from "@/lib/action-result";
import type { SearchableItem } from "@/lib/item-search";

type LocOption = { id: string; label: string; tempZone?: string };
type ItemOption = SearchableItem & { requiresCold?: boolean };
type InboundLineOpt = {
  id: string;
  shipmentId: string;
  label: string;
  itemId: string;
  remaining: number;
};

export function ReceiveForm({
  items,
  locations,
  inboundLines,
  initialInboundId,
}: {
  items: ItemOption[];
  locations: LocOption[];
  inboundLines: InboundLineOpt[];
  initialInboundId?: string | null;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    receiveAction,
    null,
  );
  const [showAck, setShowAck] = useState(false);
  const initialLine =
    inboundLines.find((l) => l.shipmentId === initialInboundId) ?? inboundLines[0];
  const [inboundLineId, setInboundLineId] = useState(
    initialInboundId ? initialLine?.id ?? "" : "",
  );
  const selectedInbound = inboundLines.find((l) => l.id === inboundLineId);
  const [selectedItemId, setSelectedItemId] = useState(selectedInbound?.itemId ?? "");
  const [selectedLocId, setSelectedLocId] = useState(locations[0]?.id ?? "");
  const [expectedQty, setExpectedQty] = useState(
    selectedInbound ? String(selectedInbound.remaining) : "",
  );
  const [actualQty, setActualQty] = useState("1");

  useEffect(() => {
    if (state?.ok === false && state.needsTempAck) {
      setShowAck(true);
    }
    if (state?.ok) {
      setShowAck(false);
    }
  }, [state]);

  useEffect(() => {
    if (selectedInbound) {
      setSelectedItemId(selectedInbound.itemId);
      setExpectedQty(String(selectedInbound.remaining));
    }
  }, [selectedInbound]);

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
        <label htmlFor="inboundLineId">Inbound PO / ASN line (optional)</label>
        <select
          id="inboundLineId"
          name="inboundLineId"
          value={inboundLineId}
          onChange={(e) => {
            setInboundLineId(e.target.value);
            if (!e.target.value) {
              setExpectedQty("");
            }
          }}
        >
          <option value="">Ad-hoc receive (no PO)</option>
          {inboundLines.map((line) => (
            <option key={line.id} value={line.id}>
              {line.label}
            </option>
          ))}
        </select>
        <p className="field-hint">
          Selecting a line prefills item + remaining expected qty for short/over.
        </p>
      </div>

      <div className="field">
        <label htmlFor="itemId">Item</label>
        <ItemCombobox
          id="itemId"
          name="itemId"
          items={items}
          value={selectedItemId}
          required
          onChange={(id) => setSelectedItemId(id)}
          disabled={Boolean(selectedInbound)}
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
          className="field-hint"
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
