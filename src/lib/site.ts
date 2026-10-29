// Public site details used by metadata and the legal pages.
// TODO before going live: set NEXT_PUBLIC_SITE_URL and replace the contact
// details and legal entity below with your own.

export const site = {
  name: "SmartStock",
  description:
    "Inventory for small warehouses and shops: products, storage locations and an audit trail for every stock movement, with barcode scanning.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  /** Who runs the service and is responsible for personal data. */
  operator: "SmartStock (operator name to be confirmed)",
  contactEmail: "privacy@smartstock.example",
  securityEmail: "security@smartstock.example",
  jurisdiction: "the country where the operator is established",
  legalUpdated: "29 October 2026",
} as const;

/** Unsplash photos (Unsplash License: free to use, no attribution required, credited anyway). */
export const photos = {
  warehouse: { src: "https://images.unsplash.com/photo-1684695749267-233af13276d0", alt: "Tall warehouse racks stacked with boxes and pallets" },
  boxes: { src: "https://images.unsplash.com/photo-1514792368985-f80e9d482a02", alt: "A pile of brown cardboard shipping boxes" },
  forklift: { src: "https://images.unsplash.com/photo-1721937718756-3bfec49f42a2", alt: "A forklift driving down a long warehouse aisle" },
  shelf: { src: "https://images.unsplash.com/photo-1578916171728-46686eac8d58", alt: "Packaged goods lined up on a store shelf" },
  store: { src: "https://images.unsplash.com/photo-1722639096462-dc586c185186", alt: "Shop shelves filled with many different products" },
  store2: { src: "https://images.unsplash.com/photo-1740126102631-5ac21926178c", alt: "Rows of colourful items on retail shelving" },
  parcel: { src: "https://images.unsplash.com/photo-1647489238347-dbd651c2f37a", alt: "An open cardboard box with items packed inside" },
} as const;
