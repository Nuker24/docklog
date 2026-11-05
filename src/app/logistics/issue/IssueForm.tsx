"use client";

import { useActionState, useMemo, useState } from "react";
import { issueAction } from "./actions";
import { Flash } from "@/components/forms/Flash";
import type { ActionResult } from "@/lib/action-result";

type ClinicOpt = {
  id: string;
  label: string;
  pushEnabled: boolean;
  isPharmacySos: boolean;
};

type RequestOpt = {
  id: string;
  label: string;
  clinicId: string;
  itemId: string;
  remaining: number;
};

type StockOpt = {
  key: string;
  itemId: string;
  lotId: string;
  locationId: string;
  label: string;
  qty: number;
  commodityClass: string;
};

export function IssueForm({
  clinics,
  requests,
  stock,
}: {
  clinics: ClinicOpt[];
  requests: RequestOpt[];
  stock: StockOpt[];
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    issueAction,
    null,
  );
  const [mode, setMode] = useState<"request" | "push">(
    requests.length ? "request" : "push",
  );
  const [requestId, setRequestId] = useState(requests[0]?.id ?? "");
  const [clinicId, setClinicId] = useState(
    clinics.find((c) => c.pushEnabled)?.id ?? clinics[0]?.id ?? "",
  );

  const selectedRequest = requests.find((r) => r.id === requestId);
  const effectiveClinicId =
    mode === "request" ? selectedRequest?.clinicId ?? "" : clinicId;

  const stockForItem = useMemo(() => {
    const itemId =
      mode === "request" ? selectedRequest?.itemId : undefined;
    return stock.filter((s) => {
      if (itemId && s.itemId !== itemId) return false;
      // For push to non-pharmacy: expendable only; pharmacy clinic can get any
      const clinic = clinics.find((c) => c.id === effectiveClinicId);
      if (mode === "push" && clinic && !clinic.isPharmacySos) {
        return s.commodityClass === "EXPENDABLE_MEDICAL_SUPPLY";
      }
      return true;
    });
  }, [stock, mode, selectedRequest, clinics, effectiveClinicId]);

  const [stockKey, setStockKey] = useState(stockForItem[0]?.key ?? "");
  const selectedStock =
    stockForItem.find((s) => s.key === stockKey) ?? stockForItem[0];

  const pushClinics = clinics.filter((c) => c.pushEnabled);

  return (
    <form action={formAction} className="ops-form">
      {state && <Flash kind={state.ok ? "ok" : "fail"} message={state.message} />}

      <fieldset className="mode-toggle">
        <legend>Issue mode</legend>
        <label>
          <input
            type="radio"
            name="mode_ui"
            checked={mode === "request"}
            onChange={() => setMode("request")}
            disabled={!requests.length}
          />
          Fulfill open request
        </label>
        <label>
          <input
            type="radio"
            name="mode_ui"
            checked={mode === "push"}
            onChange={() => setMode("push")}
            disabled={!pushClinics.length}
          />
          Logistics push
        </label>
      </fieldset>

      {mode === "request" ? (
        <div className="field">
          <label htmlFor="requestId">Open logistics request</label>
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
          {!requests.length && (
            <p className="field-hint">No open logistics requests right now.</p>
          )}
        </div>
      ) : (
        <>
          <input type="hidden" name="requestId" value="" />
          <div className="field">
            <label htmlFor="toClinicId">Clinic (push enabled)</label>
            <select
              id="toClinicId"
              name="toClinicId"
              required
              value={clinicId}
              onChange={(e) => setClinicId(e.target.value)}
            >
              {pushClinics.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {mode === "request" && selectedRequest && (
        <input type="hidden" name="toClinicId" value={selectedRequest.clinicId} />
      )}

      <div className="field">
        <label htmlFor="stockKey">Pick from warehouse stock</label>
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
        {!stockForItem.length && (
          <p className="field-hint">No matching warehouse stock.</p>
        )}
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
            defaultValue={
              mode === "request" && selectedRequest
                ? Math.min(selectedRequest.remaining, selectedStock?.qty ?? 1)
                : 1
            }
            max={selectedStock?.qty}
          />
          {selectedStock && (
            <p className="field-hint">On hand: {selectedStock.qty}</p>
          )}
        </div>
        <div className="field">
          <label htmlFor="notes">Notes (optional)</label>
          <input id="notes" name="notes" />
        </div>
      </div>

      <button
        type="submit"
        className="btn-primary"
        disabled={pending || !selectedStock}
      >
        {pending ? "Issuing…" : "Issue to clinic"}
      </button>
    </form>
  );
}
