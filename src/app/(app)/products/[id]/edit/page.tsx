import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/product-form";
import { Alert, Card, PageHeader } from "@/components/ui";
import { getContext, isOwner } from "@/lib/auth";
import type { Location, Product } from "@/lib/types";
import { isUuid } from "@/lib/validation";
import { saveProduct } from "../../actions";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const ctx = await getContext();

  const [productRes, locRes] = await Promise.all([
    ctx.supabase.from("products").select("*").eq("id", id).maybeSingle(),
    ctx.supabase.from("locations").select("id, code, name, is_active").eq("workspace_id", ctx.workspace.id).order("code"),
  ]);
  const product = productRes.data as Product | null;
  if (!product) notFound();

  // Offer active locations, plus the current one even if it has been deactivated.
  const locations = ((locRes.data ?? []) as Pick<Location, "id" | "code" | "name" | "is_active">[]).filter(
    (l) => l.is_active || l.id === product.primary_location_id,
  );

  return (
    <>
      <PageHeader title={`Edit ${product.name}`} description="Change details here. Quantity changes go through stock movements." />
      {!isOwner(ctx) ? (
        <Alert tone="warning">Only workspace owners can edit products.</Alert>
      ) : (
        <Card className="max-w-3xl">
          <ProductForm action={saveProduct.bind(null, product.id)} product={product} locations={locations} cancelHref={`/products/${product.id}`} />
        </Card>
      )}
    </>
  );
}
