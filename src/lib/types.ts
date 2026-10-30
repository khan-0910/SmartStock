// Row shapes returned by Supabase queries. numeric columns arrive as numbers
// or strings depending on the driver; we only format them for display.

export type MovementType = "stock_in" | "stock_out" | "adjustment";
export type Role = "owner" | "staff";

export type Location = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
};

export type Product = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  unit: string;
  cost_price: number | string | null;
  selling_price: number | string | null;
  quantity_on_hand: number;
  reorder_level: number;
  primary_location_id: string | null;
  is_active: boolean;
  is_low_stock: boolean;
  /** Currency the prices were typed in, and units of it per 1 USD at the time. Prices themselves are USD. */
  price_currency: string;
  price_fx_rate: number | string;
  created_at: string;
  updated_at: string;
};

export type ProductWithLocation = Product & {
  location: Pick<Location, "id" | "code" | "name" | "is_active"> | null;
};

export type Movement = {
  id: string;
  product_id: string;
  movement_type: MovementType;
  quantity_delta: number;
  quantity_before: number;
  quantity_after: number;
  reason: string;
  reference: string | null;
  created_by: string;
  created_at: string;
  product: Pick<Product, "id" | "name" | "sku" | "unit"> | null;
  location: Pick<Location, "code"> | null;
};

/** Result of a form server action. */
export type ActionState<T = undefined> =
  | { status: "idle" }
  | { status: "success"; message: string; data?: T }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string>;
      /** Safe values to put back in the form. */
      values?: Record<string, string>;
      link?: { href: string; label: string };
    };
