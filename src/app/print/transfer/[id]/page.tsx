import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatQty } from "@/lib/inventory";
import { canAccessClinic, canAccessLogistics } from "@/lib/roles";
import { PrintButton } from "@/components/print/PrintButton";
import "./print.css";

export default async function TransferPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireSession();
  const { id } = await params;

  const transfer = await prisma.transfer.findFirst({
    where: { id, hospitalId: user.hospitalId },
    include: {
      toClinic: true,
      fromClinic: true,
      issuedBy: true,
      lines: {
        include: {
          item: true,
          lot: true,
          fromLocation: true,
        },
      },
      hospital: true,
    },
  });

  if (!transfer) notFound();

  const logisticsOk = canAccessLogistics(user.role);
  const clinicOk =
    canAccessClinic(user.role) &&
    (user.clinicId === transfer.toClinicId ||
      user.clinicId === transfer.fromClinicId);

  if (!logisticsOk && !clinicOk) {
    notFound();
  }

  const backHref = logisticsOk ? "/logistics/transfers" : "/clinic/confirm";

  const fromLabel =
    transfer.fromClinic?.name ??
    (transfer.kind === "LOGISTICS_PUSH" ||
    transfer.kind === "REQUEST_FULFILLMENT"
      ? "Central Supply Warehouse"
      : transfer.kind === "PHARMACY_C2C"
        ? "Pharmacy SOS"
        : "Source");

  return (
    <div className="print-root">
      <div className="print-toolbar no-print">
        <Link href={backHref}>← Back</Link>
        <PrintButton />
      </div>

      <article className="packing-slip">
        <header className="slip-header">
          <div>
            <p className="slip-brand">DockLog</p>
            <h1>Pick list / packing slip</h1>
          </div>
          <div className="slip-meta">
            <p>
              <span>Hospital</span> {transfer.hospital.name}
            </p>
            <p>
              <span>Transfer</span> {transfer.id.slice(-8).toUpperCase()}
            </p>
            <p>
              <span>Status</span> {transfer.status}
            </p>
          </div>
        </header>

        <dl className="slip-parties">
          <div>
            <dt>From</dt>
            <dd>{fromLabel}</dd>
          </div>
          <div>
            <dt>To clinic</dt>
            <dd>
              {transfer.toClinic.code} — {transfer.toClinic.name}
            </dd>
          </div>
          <div>
            <dt>Kind</dt>
            <dd>{transfer.kind.replaceAll("_", " ")}</dd>
          </div>
          <div>
            <dt>Issued</dt>
            <dd>
              {transfer.issuedAt.toISOString().slice(0, 16).replace("T", " ")}
              {transfer.issuedBy ? ` · ${transfer.issuedBy.displayName}` : ""}
            </dd>
          </div>
        </dl>

        {transfer.notes && (
          <p className="slip-notes">
            <strong>Notes:</strong> {transfer.notes}
          </p>
        )}

        <table className="slip-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Item</th>
              <th>Lot</th>
              <th>Expiry</th>
              <th>From location</th>
              <th className="num">Qty</th>
            </tr>
          </thead>
          <tbody>
            {transfer.lines.map((line) => (
              <tr key={line.id}>
                <td className="mono">{line.item.sku}</td>
                <td>{line.item.name}</td>
                <td className="mono">{line.lot.lotNumber}</td>
                <td className="mono">
                  {line.lot.expiresOn
                    ? line.lot.expiresOn.toISOString().slice(0, 10)
                    : "—"}
                </td>
                <td>
                  <span className="mono">{line.fromLocation.code}</span>{" "}
                  {line.fromLocation.name}
                </td>
                <td className="num">
                  {formatQty(line.quantity)} {line.item.uom}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <footer className="slip-foot">
          <div>
            <p>Picked by ________________</p>
            <p>Date ________</p>
          </div>
          <div>
            <p>Received by ________________</p>
            <p>Date ________</p>
          </div>
        </footer>
      </article>
    </div>
  );
}
