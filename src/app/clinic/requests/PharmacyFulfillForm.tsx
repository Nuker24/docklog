"use client";

import { useActionState, useMemo, useState } from "react";
import { pharmacyFulfillAction } from "./actions";
import { Flash } from "@/components/forms/Flash";
import type { ActionResult } from "@/lib/action-result";

type RequestOpt = {
  id: string;
  clinicId: string;
  itemId: string;
  remaining: number;
  label: string;
};

type StockOpt = {
  key: string;
  itemId: string;
  lotId: string;
  locationId: string;
  label: string;
  qty: number;
};

export function PharmacyFulfillForm({
  requests,
  stock,
}: {
  requests: RequestOpt[];
  stock: StockOpt[];
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    pharmacyFulfillAction,
    null,
  );
  const [requestId, setRequestId] = useState(requests[0]?.id ?? "");
  const selected = requests.find((r) => r.id === requestId);
  const stockForItem = useMemo(
    () => stock.filter((s) => !selected || s.itemId === selected.itemId),
    [stock, selected],
  );
  const [stockKey, setStockKey] = useState(stockForItem[0]?.key ?? "");
  const selectedStock =
    stockForItem.find((s) => s.key === stockKey) ?? stockForItem[0];

  if (!requests.length) {
    return <p className="empty">No open Pharmacy SOS requests from clinics.</p>;
  }

  return (
    <form action={formAction} className="ops-form">
      {state && <Flash kind={state.ok ? "ok" : "fail"} message={state.message} />}

      <div className="field">
        <label htmlFor="requestId">Open Pharmacy C2C request</label>
        <select
          id="requestId"
          name="requestId"
          required
          value={requestId}
          onChange={(e) => setRequestId(e.target.value)}
        >
          {requests.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {selected && (
        <input type="hidden" name="toClinicId" value={selected.clinicId} />
      )}

      <div className="field">
        <label htmlFor="stockKey">Pick from Pharmacy stock</label>
        <select
          id="stockKey"
          value={selectedStock?.key ?? ""}
          onChange={(e) => setStockKey(e.target.value)}
          required
        >
          {stockForItem.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {selectedStock && (
        <>
          <input type="hidden" name="itemId" value={selectedStock.itemId} />
          <input type="hidden" name="lotId" value={selectedStock.lotId} />
          <input
            type="hidden"
            name="fromLocationId"
            value={selectedStock.locationId}
          />
        </>
      )}

      <div className="field">
        <label htmlFor="quantity">Quantity</label>
        <input
          id="quantity"
          name="quantity"
          type="number"
          min="0.001"
          step="any"
          required
          defaultValue={
            selected
              ? Math.min(selected.remaining, selectedStock?.qty ?? 1)
              : 1
          }
        />
      </div>

      <button
        type="submit"
        className="btn-primary"
        disabled={pending || !selectedStock}
      >
        {pending ? "Issuing…" : "Issue to requesting clinic"}
      </button>
    </form>
  );
}
