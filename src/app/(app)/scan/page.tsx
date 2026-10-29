import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { Scanner } from "./scanner";

export const metadata: Metadata = { title: "Scan" };

export default function ScanPage() {
  return (
    <>
      <PageHeader title="Scan barcode" kicker="Barcode lookup" description="Find a product by barcode, then record stock in, stock out or an adjustment." />
      <Scanner />
    </>
  );
}
