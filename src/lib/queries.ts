// PostgREST select strings. FK hints are explicit because products and
// locations are also linked through stock_movements.

export const PRODUCT_SELECT = "*, location:locations!products_location_fkey(id, code, name, is_active)";

export const MOVEMENT_SELECT =
  "id, product_id, movement_type, quantity_delta, quantity_before, quantity_after, reason, reference, created_by, created_at, " +
  "product:products!stock_movements_product_fkey(id, name, sku, unit), " +
  "location:locations!stock_movements_location_fkey(code)";

export const PAGE_SIZE = 25;
