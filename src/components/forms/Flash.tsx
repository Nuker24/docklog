export function Flash({
  kind,
  message,
}: {
  kind: "ok" | "fail" | "warn";
  message: string;
}) {
  return (
    <div className={`flash flash-${kind}`} role="status">
      {message}
    </div>
  );
}
