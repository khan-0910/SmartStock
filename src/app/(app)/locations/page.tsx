import type { Metadata } from "next";
import Link from "next/link";
import { ActionButton } from "@/components/action-button";
import { LocationForm } from "@/components/location-form";
import { Alert, Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { getContext, isOwner } from "@/lib/auth";
import { friendlyDbError } from "@/lib/errors";
import { qs } from "@/lib/format";
import type { Location } from "@/lib/types";
import { isUuid } from "@/lib/validation";
import { saveLocation, setLocationActive } from "./actions";

export const metadata: Metadata = { title: "Locations" };

type LocationRow = Location & { products: { count: number }[] };

export default async function LocationsPage({ searchParams }: { searchParams: Promise<{ edit?: string; saved?: string }> }) {
  const sp = await searchParams;
  const ctx = await getContext();
  const owner = isOwner(ctx);
  const { data, error } = await ctx.supabase
    .from("locations")
    .select("id, code, name, description, is_active, products:products!products_location_fkey(count)")
    .eq("workspace_id", ctx.workspace.id)
    .order("is_active", { ascending: false })
    .order("code");
  const locations = (data ?? []) as LocationRow[];
  const editing = owner && isUuid(sp.edit) ? locations.find((l) => l.id === sp.edit) : undefined;

  return (
    <>
      <PageHeader
        title="Locations"
        kicker="Storage"
        tone="lavender"
        description="Where products are stored. Each product has one primary location. Locations are deactivated, never deleted, so history stays intact."
        stats={[
          { label: "Active", value: locations.filter((l) => l.is_active).length },
          { label: "Inactive", value: locations.filter((l) => !l.is_active).length },
          { label: "Products assigned", value: locations.reduce((n, l) => n + (l.products?.[0]?.count ?? 0), 0) },
        ]}
      />

      {sp.saved && (
        <div className="mb-4">
          <Alert tone="success" role="status">
            Location saved.
          </Alert>
        </div>
      )}

      {owner && (
        <Card className="mb-6">
          <h2 className="mb-4 font-semibold">{editing ? `Edit ${editing.code}` : "Add a location"}</h2>
          {editing ? (
            <LocationForm key={editing.id} action={saveLocation.bind(null, editing.id)} location={editing} />
          ) : (
            <LocationForm action={saveLocation.bind(null, null)} />
          )}
        </Card>
      )}

      {error ? (
        <Alert tone="error" role="alert" title="Could not load locations">
          {friendlyDbError(error, "locations")}
        </Alert>
      ) : locations.length === 0 ? (
        <EmptyState title="No locations yet">Add your first storage location above, such as a shelf or bin code like A-01-03.</EmptyState>
      ) : (
        <Card className="p-0 sm:p-0">
          <ul className="divide-y divide-ink/10">
            {locations.map((l) => {
              const productCount = l.products?.[0]?.count ?? 0;
              return (
                <li key={l.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{l.code}</span>
                      <span className="text-sm text-ink">{l.name}</span>
                      <StatusBadge active={l.is_active} inactiveLabel="Inactive" />
                    </div>
                    {l.description && <p className="mt-1 text-sm text-ink/60">{l.description}</p>}
                    <p className="mt-1 text-xs text-ink/60">
                      {productCount > 0 ? (
                        <Link href={`/products${qs({ location: l.id, status: "all" })}`} className="hover:underline">
                          {productCount} product{productCount === 1 ? "" : "s"} stored here
                        </Link>
                      ) : (
                        "No products assigned"
                      )}
                    </p>
                  </div>
                  {owner && (
                    <div className="flex shrink-0 flex-wrap items-start gap-2">
                      <Link href={`/locations?edit=${l.id}`} className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50">
                        Edit
                      </Link>
                      {l.is_active ? (
                        <ActionButton
                          action={setLocationActive.bind(null, l.id, false)}
                          label="Deactivate"
                          pendingLabel="Saving…"
                          confirm={{
                            title: `Deactivate ${l.code}?`,
                            body:
                              productCount > 0
                                ? `${productCount} product(s) still use this location and will keep it until you move them. It can no longer be chosen for products.`
                                : "It can no longer be chosen for products. You can reactivate it later.",
                            confirmLabel: "Deactivate",
                          }}
                        />
                      ) : (
                        <ActionButton action={setLocationActive.bind(null, l.id, true)} label="Reactivate" pendingLabel="Saving…" />
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
