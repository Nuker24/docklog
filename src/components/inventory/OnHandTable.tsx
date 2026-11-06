import { formatQty } from "@/lib/inventory";
import { tempZoneLabel } from "@/lib/temp-zone";
import type { CommodityClass, TempZone } from "@prisma/client";

export type OnHandRow = {
  id: string;
  sku: string;
  itemName: string;
  commodityClass: CommodityClass;
  lotNumber: string;
  expiresOn: Date | null;
  locationCode: string;
  locationName: string;
  tempZone: TempZone;
  quantity: { toString(): string } | number | string;
  uom: string;
};

export function OnHandTable({
  rows,
  emptyMessage,
}: {
  rows: OnHandRow[];
  emptyMessage: string;
}) {
  if (!rows.length) {
    return <p className="empty">{emptyMessage}</p>;
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>SKU</th>
          <th>Item</th>
          <th>Lot</th>
          <th>Expiry</th>
          <th>Location</th>
          <th>Zone</th>
          <th className="num">Qty</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td className="mono">{row.sku}</td>
            <td>
              {row.itemName}
              {row.commodityClass === "PHARMACY" && (
                <span className="tag tag-cold">Pharmacy</span>
              )}
            </td>
            <td className="mono">{row.lotNumber}</td>
            <td className="mono">
              {row.expiresOn
                ? row.expiresOn.toISOString().slice(0, 10)
                : "—"}
            </td>
            <td>
              <span className="mono">{row.locationCode}</span>{" "}
              <span className="muted">{row.locationName}</span>
            </td>
            <td>{tempZoneLabel(row.tempZone)}</td>
            <td className="num">
              {formatQty(row.quantity as string)} {row.uom}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
