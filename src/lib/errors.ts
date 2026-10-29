// Turns database/PostgREST errors into short, human messages. Technical
// detail goes to the server log only.

export type DbError = { code?: string; message?: string; details?: string | null; hint?: string | null };

const MESSAGES: Record<string, string> = {
  NOT_AUTHENTICATED: "Your session has expired. Please sign in again.",
  PERMISSION_DENIED: "You do not have permission to do that.",
  PRODUCT_NOT_FOUND: "That product was not found in your workspace.",
  PRODUCT_ARCHIVED: "This product is archived. Restore it before changing stock.",
  INVALID_QUANTITY: "Enter a valid whole-number quantity.",
  INVALID_REASON: "A reason is required (up to 200 characters).",
  INVALID_REFERENCE: "Reference must be 200 characters or fewer.",
  INVALID_MOVEMENT_TYPE: "Unknown movement type.",
  NO_CHANGE: "The counted quantity matches the current quantity, so there is nothing to adjust.",
  QUANTITY_LIMIT: "That would exceed the maximum quantity this app supports.",
  LOCATION_INACTIVE: "That location is inactive. Choose an active location.",
  WORKSPACE_NOT_EMPTY: "Demo data can only be loaded into an empty workspace.",
  MOVEMENT_IMMUTABLE: "Movement history cannot be edited.",
};

/** Machine code raised by our SQL functions, e.g. INSUFFICIENT_STOCK. */
export function dbErrorCode(error: DbError): string | undefined {
  const msg = error.message ?? "";
  if (msg === "INSUFFICIENT_STOCK" || MESSAGES[msg]) return msg;
  if (error.code === "23505") {
    if (msg.includes("products_workspace_sku_key")) return "DUPLICATE_SKU";
    if (msg.includes("products_workspace_barcode_key")) return "DUPLICATE_BARCODE";
    if (msg.includes("locations_workspace_code_key")) return "DUPLICATE_LOCATION_CODE";
  }
  if (error.code === "42501" || /row-level security|permission denied/i.test(msg)) return "PERMISSION_DENIED";
  if (error.code === "PGRST301" || error.code === "PGRST303") return "NOT_AUTHENTICATED";
  return undefined;
}

export function friendlyDbError(error: DbError, context: string): string {
  const code = dbErrorCode(error);
  if (code === "INSUFFICIENT_STOCK") {
    const available = /available=(\d+)/.exec(error.details ?? "")?.[1];
    return available !== undefined
      ? `Not enough stock. Only ${available} available right now.`
      : "Not enough stock for that quantity.";
  }
  if (code === "DUPLICATE_SKU") return "Another product already uses this SKU.";
  if (code === "DUPLICATE_BARCODE") return "Another product already uses this barcode.";
  if (code === "DUPLICATE_LOCATION_CODE") return "Another location already uses this code.";
  if (code && MESSAGES[code]) return MESSAGES[code];

  console.error(`[${context}]`, error.code, error.message);
  if (/fetch failed|network|timeout|ECONN/i.test(error.message ?? "")) {
    return "Could not reach the database. Check your connection and try again. Nothing was saved.";
  }
  return "Something went wrong. Nothing was saved. Please try again.";
}
