import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { Scanner } from "./scanner";

export const metadata: Metadata = { title: "Scan" };

export default function ScanPage() {
  return (
    <>
      <PageHeader
        title="Scan barcode"
        kicker="Barcode lookup"
        tone="sage"
        description="Find a product by barcode, then record stock in, stock out or an adjustment. A scan never changes stock on its own."
        stats={[
          { label: "Input methods", value: "Camera · USB · Typed" },
          { label: "Formats", value: "EAN · UPC · Code 128" },
        ]}
      />
      <Scanner />
    </>
  );
}
