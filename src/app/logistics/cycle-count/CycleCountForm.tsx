"use client";

import { useActionState, useMemo, useState } from "react";
import { cycleCountAction } from "./actions";
import { Flash } from "@/components/forms/Flash";
import { ItemCombobox } from "@/components/forms/ItemCombobox";
import type { ActionResult } from "@/lib/action-result";
import type { SearchableItem } from "@/lib/item-search";
import { formatExpiryLabel } from "@/lib/fefo";

type LocOpt = { id: string; label: string };

type BalanceOpt = {
  key: string;
  locationId: string;
  itemId: string;
  lotId: string;
  sku: string;
  lotNumber: string;
  expiresOn: string | null;
  qty: number;
  label: string;
};

export function CycleCountForm({
  locations,
  balances,
  catalog,
}: {
  locations: LocOpt[];
  balances: BalanceOpt[];
  catalog: SearchableItem[];
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    cycleCountAction,
    null,
  );
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [itemId, setItemId] = useState("");
  const [lineKey, setLineKey] = useState("");

  const linesAtLocation = useMemo(() => {
    return balances.filter((b) => {
      if (b.locationId !== locationId) return false;
      if (itemId && b.itemId !== itemId) return false;
      return true;
    });
  }, [balances, locationId, itemId]);

  const selected = linesAtLocation.find((l) => l.key === lineKey) ?? linesAtLocation[0];

  const itemsAtLocation = useMemo(() => {
    const ids = new Set(
      balances.filter((b) => b.locationId === locationId).map((b) => b.itemId),
    );
    return catalog.filter((c) => ids.has(c.id));
  }, [balances, locationId, catalog]);

  return (
    <form action={formAction} className="ops-form">
      {state && <Flash kind={state.ok ? "ok" : "fail"} message={state.message} />}

      <div className="field">
        <label htmlFor="locationId">Warehouse location</label>
        <select
          id="locationId"
          name="locationId"
          required
          value={locationId}
          onChange={(e) => {
            setLocationId(e.target.value);
            setItemId("");
            setLineKey("");
          }}
        >
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="filterItem">Filter item (optional)</label>
        <ItemCombobox
          id="filterItem"
          name=""
          items={itemsAtLocation}
          value={itemId}
          onChange={(id) => {
            setItemId(id);
            setLineKey("");
          }}
          placeholder="Search to narrow lots at this location…"
        />
      </div>

      <div className="field">
        <label htmlFor="lineKey">Balance line (lot)</label>
        <select
          id="lineKey"
          value={selected?.key ?? ""}
          onChange={(e) => setLineKey(e.target.value)}
          required
          disabled={!linesAtLocation.length}
        >
          {linesAtLocation.map((l) => (
            <option key={l.key} value={l.key}>
              {l.label}
            </option>
          ))}
        </select>
        {!linesAtLocation.length && (
          <p className="field-hint">No on-hand lines at this location (for the filter).</p>
        )}
        {selected && (
          <p className="field-hint">
            System qty: {selected.qty} · exp {formatExpiryLabel(selected.expiresOn)}
          </p>
        )}
      </div>

      {selected && (
        <>
          <input type="hidden" name="itemId" value={selected.itemId} />
          <input type="hidden" name="lotId" value={selected.lotId} />
        </>
      )}

      <div className="field-row">
        <div className="field">
          <label htmlFor="countedQty">Counted quantity</label>
          <input
            id="countedQty"
            name="countedQty"
            type="number"
            min="0"
            step="any"
            required
            key={selected?.key ?? "none"}
            defaultValue={selected?.qty ?? 0}
          />
        </div>
        <div className="field">
          <label htmlFor="note">Note (optional)</label>
          <input id="note" name="note" placeholder="Damaged / found / recount" />
        </div>
      </div>

      <button
        type="submit"
        className="btn-primary"
        disabled={pending || !selected}
      >
        {pending ? "Saving…" : "Post cycle count"}
      </button>
    </form>
  );
}
