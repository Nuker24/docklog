export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string; needsTempAck?: boolean };

export function fail(message: string, extra?: { needsTempAck?: boolean }): ActionResult {
  return { ok: false, message, ...extra };
}

export function ok(message: string): ActionResult {
  return { ok: true, message };
}
