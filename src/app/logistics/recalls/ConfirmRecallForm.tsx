"use client";

import { useActionState } from "react";
import { confirmRecallAction } from "./actions";
import { Flash } from "@/components/forms/Flash";
import type { ActionResult } from "@/lib/action-result";

type Loc = { id: string; label: string };

export function ConfirmRecallForm({
  taskId,
  locations,
}: {
  taskId: string;
  locations: Loc[];
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    confirmRecallAction,
    null,
  );

  return (
    <form action={formAction} className="inline-form">
      {state && <Flash kind={state.ok ? "ok" : "fail"} message={state.message} />}
      <input type="hidden" name="taskId" value={taskId} />
      <select name="toLocationId" required defaultValue={locations[0]?.id}>
        {locations.map((l) => (
          <option key={l.id} value={l.id}>
            {l.label}
          </option>
        ))}
      </select>
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "…" : "Confirm return"}
      </button>
    </form>
  );
}
