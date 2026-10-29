import type { Metadata } from "next";
import { ProductForm } from "@/components/product-form";
import { Alert, Card, PageHeader } from "@/components/ui";
import { getContext, isOwner } from "@/lib/auth";
import type { Location } from "@/lib/types";
import { normalizeBarcode } from "@/lib/validation";
import { saveProduct } from "../actions";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ barcode?: string }> }) {
  const { barcode } = await searchParams;
  const ctx = await getContext();
  const { data } = await ctx.supabase
    .from("locations")
    .select("id, code, name, is_active")
    .eq("workspace_id", ctx.workspace.id)
    .eq("is_active", true)
    .order("code");
  const prefill = barcode ? normalizeBarcode(barcode).slice(0, 64) : undefined;

  return (
    <>
      <PageHeader title="Add product" kicker="Catalog" description="Opening stock is recorded afterwards as a stock-in movement, so it appears in history." />
      {!isOwner(ctx) ? (
        <Alert tone="warning">Only workspace owners can add products.</Alert>
      ) : (
        <Card className="max-w-3xl">
          {prefill && (
            <div className="mb-4">
              <Alert tone="info">
                Barcode <strong className="font-mono">{prefill}</strong> was not found, so it has been filled in for you.
              </Alert>
            </div>
          )}
          <ProductForm
            action={saveProduct.bind(null, null)}
            locations={(data ?? []) as Pick<Location, "id" | "code" | "name" | "is_active">[]}
            prefillBarcode={prefill}
            cancelHref={prefill ? "/scan" : "/products"}
          />
        </Card>
      )}
    </>
  );
}
