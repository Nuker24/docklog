"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { clinicTransferAction } from "./actions";
import { Flash } from "@/components/forms/Flash";
import { ItemCombobox } from "@/components/forms/ItemCombobox";
import type { ActionResult } from "@/lib/action-result";
import type { SearchableItem } from "@/lib/item-search";
import { formatExpiryLabel, sortStockByFefo } from "@/lib/fefo";

type ClinicOpt = { id: string; label: string };
type StockOpt = {
  key: string;
  itemId: string;
  lotId: string;
  locationId: string;
  qty: number;
  lotNumber: string;
  locationCode: string;
  expiresOn: string | null;
  commodityClass: string;
};

export function ClinicTransferForm({
  clinics,
  stock,
  catalog,
  isPharmacySos,
}: {
  clinics: ClinicOpt[];
  stock: StockOpt[];
  catalog: SearchableItem[];
  isPharmacySos: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    clinicTransferAction,
    null,
  );
  const [itemId, setItemId] = useState("");
  const [stockKey, setStockKey] = useState("");
  const [toClinicId, setToClinicId] = useState(clinics[0]?.id ?? "");

  const transferableCatalog = useMemo(() => {
    if (isPharmacySos) return catalog;
    return catalog.filter((c) => c.commodityClass === "EXPENDABLE_MEDICAL_SUPPLY");
  }, [catalog, isPharmacySos]);

  const stockForItem = useMemo(() => {
    const filtered = stock.filter((s) => {
      if (itemId && s.itemId !== itemId) return false;
      if (!isPharmacySos && s.commodityClass === "PHARMACY") return false;
      return true;
    });
    return sortStockByFefo(filtered);
  }, [stock, itemId, isPharmacySos]);

  useEffect(() => {
    setStockKey(stockForItem[0]?.key ?? "");
  }, [stockForItem]);

  const selected = stockForItem.find((s) => s.key === stockKey) ?? stockForItem[0];

  const printHref =
    state?.ok && state.message.includes("/print/transfer/")
      ? state.message.split("Print slip: ")[1]
      : null;

  return (
    <form action={formAction} className="ops-form">
      {state && <Flash kind={state.ok ? "ok" : "fail"} message={state.message} />}
      {printHref && (
        <p className="field-hint">
          <Link className="btn-link" href={printHref} target="_blank">
            Open printable packing slip
          </Link>
        </p>
      )}

      <div className="field">
        <label htmlFor="toClinicId">Destination clinic</label>
        <select
          id="toClinicId"
          name="toClinicId"
          required
          value={toClinicId}
          onChange={(e) => setToClinicId(e.target.value)}
        >
          {clinics.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="itemId">Item</label>
        <ItemCombobox
          id="itemId"
          name=""
          items={transferableCatalog}
          value={itemId}
          onChange={(id) => {
            setItemId(id);
            setStockKey("");
          }}
        />
        <p className="field-hint">
          {isPharmacySos
            ? "Pharmacy SOS may transfer drugs or expendable supply."
            : "Non-Pharmacy clinics may transfer expendable medical supply only. Drugs come from Pharmacy SOS."}
        </p>
      </div>

      <div className="field">
        <label htmlFor="stockKey">Lot / clinic location (FEFO)</label>
        <select
          id="stockKey"
          value={selected?.key ?? ""}
          onChange={(e) => setStockKey(e.target.value)}
          required
          disabled={!itemId}
        >
          {stockForItem.map((s) => (
            <option key={s.key} value={s.key}>
              {s.lotNumber} · exp {formatExpiryLabel(s.expiresOn)} · {s.locationCode} ·{" "}
              {s.qty}
            </option>
          ))}
        </select>
      </div>

      {selected && (
        <>
          <input type="hidden" name="itemId" value={selected.itemId} />
          <input type="hidden" name="lotId" value={selected.lotId} />
          <input type="hidden" name="fromLocationId" value={selected.locationId} />
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
            defaultValue={1}
            max={selected?.qty}
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
        disabled={pending || !selected || !itemId}
      >
        {pending ? "Transferring…" : "Issue clinic transfer"}
      </button>
    </form>
  );
}
