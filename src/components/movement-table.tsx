import Link from "next/link";
import { formatDateTime, formatInt } from "@/lib/format";
import type { Movement } from "@/lib/types";
import { DeltaBadge, MovementTypeBadge } from "./ui";

/** Read-only ledger view. Movements are immutable: no edit or delete here. */
export function MovementTable({ movements, currentUserId, showProduct = true }: { movements: Movement[]; currentUserId: string; showProduct?: boolean }) {
  const actor = (id: string) => (id === currentUserId ? "You" : `Member ${id.slice(0, 6)}`);
  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Stock movements, newest first</caption>
          <thead className="border-b border-ink/10 text-xs uppercase tracking-wide text-ink/60">
            <tr>
              <th scope="col" className="py-2 pr-3 font-medium">When</th>
              {showProduct && <th scope="col" className="py-2 pr-3 font-medium">Product</th>}
              <th scope="col" className="py-2 pr-3 font-medium">Type</th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">Change</th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">Before → After</th>
              <th scope="col" className="py-2 pr-3 font-medium">Reason</th>
              <th scope="col" className="py-2 pr-3 font-medium">Location</th>
              <th scope="col" className="py-2 font-medium">By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {movements.map((m) => (
              <tr key={m.id} className="align-top transition-colors duration-200 hover:bg-canvas/60">
                <td className="whitespace-nowrap py-2 pr-3 text-ink/60">{formatDateTime(m.created_at)}</td>
                {showProduct && (
                  <td className="py-2 pr-3">
                    {m.product ? (
                      <Link href={`/products/${m.product.id}`} className="font-medium text-ink hover:underline">
                        {m.product.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                    <div className="text-xs text-ink/60">{m.product?.sku}</div>
                  </td>
                )}
                <td className="py-2 pr-3">
                  <MovementTypeBadge type={m.movement_type} />
                </td>
                <td className="py-2 pr-3 text-right">
                  <DeltaBadge delta={m.quantity_delta} />
                </td>
                <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums text-ink/80">
                  {formatInt(m.quantity_before)} → {formatInt(m.quantity_after)}
                </td>
                <td className="py-2 pr-3">
                  <div className="text-ink">{m.reason}</div>
                  {m.reference && <div className="text-xs text-ink/60">Ref: {m.reference}</div>}
                </td>
                <td className="py-2 pr-3 text-ink/60">{m.location?.code ?? "—"}</td>
                <td className="py-2 text-ink/60">{actor(m.created_by)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile list */}
      <ul className="divide-y divide-ink/10 md:hidden">
        {movements.map((m) => (
          <li key={m.id} className="py-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {showProduct && m.product && (
                  <Link href={`/products/${m.product.id}`} className="block truncate font-medium text-ink hover:underline">
                    {m.product.name}
                  </Link>
                )}
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  <MovementTypeBadge type={m.movement_type} />
                  <span className="text-xs text-ink/60">{formatDateTime(m.created_at)}</span>
                </div>
              </div>
              <div className="text-right">
                <DeltaBadge delta={m.quantity_delta} />
                <div className="text-xs tabular-nums text-ink/60">
                  {formatInt(m.quantity_before)} → {formatInt(m.quantity_after)}
                </div>
              </div>
            </div>
            <p className="mt-1 text-ink/80">
              {m.reason}
              {m.reference && <span className="text-ink/60"> · Ref: {m.reference}</span>}
            </p>
            <p className="text-xs text-ink/60">
              {m.location?.code ? `${m.location.code} · ` : ""}
              {actor(m.created_by)}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}
