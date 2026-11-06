"use client";

import { useActionState } from "react";
import { returnRecallAction } from "./actions";
import { Flash } from "@/components/forms/Flash";
import type { ActionResult } from "@/lib/action-result";

export function ReturnRecallForm({
  taskId,
  maxQty,
}: {
  taskId: string;
  maxQty: number;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    returnRecallAction,
    null,
  );

  return (
    <form action={formAction} className="inline-form">
      {state && <Flash kind={state.ok ? "ok" : "fail"} message={state.message} />}
      <input type="hidden" name="taskId" value={taskId} />
      <input
        name="quantityReturned"
        type="number"
        min="0.001"
        max={maxQty}
        step="any"
        required
        defaultValue={maxQty}
        aria-label="Quantity returned"
      />
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "…" : "Mark returned"}
      </button>
    </form>
  );
}
