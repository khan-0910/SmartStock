import { describe, expect, it } from "vitest";
import { friendlyDbError } from "@/lib/errors";
import { formatMoney } from "@/lib/format";
import { locationSchema, movementSchema, normalizeBarcode, productSchema, safeSearchTerm } from "@/lib/validation";

const baseProduct = {
  name: "  Ceramic   mug ",
  sku: " MUG-1 ",
  barcode: "",
  description: "",
  unit: "each",
  cost_price: "",
  selling_price: "",
  reorder_level: "0",
  primary_location_id: "",
};

describe("productSchema", () => {
  it("normalises whitespace and turns blanks into null", () => {
    const r = productSchema.parse(baseProduct);
    expect(r.name).toBe("Ceramic mug");
    expect(r.sku).toBe("MUG-1");
    expect(r.barcode).toBeNull();
    expect(r.cost_price).toBeNull();
    expect(r.description).toBeNull();
    expect(r.primary_location_id).toBeNull();
  });

  it("keeps barcode leading zeroes and inner characters", () => {
    expect(productSchema.parse({ ...baseProduct, barcode: "  0012345678905 " }).barcode).toBe("0012345678905");
    expect(normalizeBarcode(" 000123 ")).toBe("000123");
  });

  it("keeps prices as exact strings and accepts an explicit zero", () => {
    const r = productSchema.parse({ ...baseProduct, cost_price: "12.5", selling_price: "0" });
    expect(r.cost_price).toBe("12.5");
    expect(r.selling_price).toBe("0");
  });

  it("accepts currency symbols and thousands separators in prices", () => {
    expect(productSchema.parse({ ...baseProduct, cost_price: "₹1,250.50" }).cost_price).toBe("1250.50");
    expect(productSchema.parse({ ...baseProduct, cost_price: "S$ 9.90" }).cost_price).toBe("9.90");
    expect(productSchema.parse({ ...baseProduct, cost_price: "¥1200" }).cost_price).toBe("1200");
  });

  it.each([
    [{ name: "   " }, "name"],
    [{ sku: "" }, "sku"],
    [{ cost_price: "-1" }, "cost_price"],
    [{ cost_price: "1.234" }, "cost_price"],
    [{ reorder_level: "1.5" }, "reorder_level"],
    [{ reorder_level: "-2" }, "reorder_level"],
    [{ primary_location_id: "not-a-uuid" }, "primary_location_id"],
    [{ barcode: "x".repeat(65) }, "barcode"],
  ])("rejects %o", (patch, field) => {
    const r = productSchema.safeParse({ ...baseProduct, ...patch });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path[0]).toBe(field);
  });
});

describe("locationSchema", () => {
  it("upper-cases and trims codes", () => {
    expect(locationSchema.parse({ code: " a-01-03 ", name: "Shelf", description: "" }).code).toBe("A-01-03");
  });
  it("rejects odd characters", () => {
    expect(locationSchema.safeParse({ code: "A,01", name: "Shelf", description: "" }).success).toBe(false);
  });
});

describe("movementSchema", () => {
  const base = {
    product_id: "00000000-0000-4000-8000-000000000001",
    movement_type: "stock_in",
    quantity: "5",
    reason: "Received",
    reference: "",
    idempotency_key: "00000000-0000-4000-8000-000000000002",
  };

  it("parses a valid stock-in", () => {
    expect(movementSchema.parse(base)).toMatchObject({ quantity: 5, reference: null });
  });

  it("requires a positive integer for stock in/out", () => {
    for (const quantity of ["0", "-1", "1.5", "abc", "1000001"]) {
      expect(movementSchema.safeParse({ ...base, quantity }).success, quantity).toBe(false);
      expect(movementSchema.safeParse({ ...base, movement_type: "stock_out", quantity }).success, quantity).toBe(false);
    }
  });

  it("allows zero as an adjustment count", () => {
    expect(movementSchema.parse({ ...base, movement_type: "adjustment", quantity: "0" }).quantity).toBe(0);
  });

  it("requires a reason", () => {
    expect(movementSchema.safeParse({ ...base, reason: "  " }).success).toBe(false);
  });

  it("rejects unknown types and forged ids", () => {
    expect(movementSchema.safeParse({ ...base, movement_type: "delete" }).success).toBe(false);
    expect(movementSchema.safeParse({ ...base, product_id: "1 or 1=1" }).success).toBe(false);
  });
});

describe("safeSearchTerm", () => {
  it("strips PostgREST filter syntax", () => {
    expect(safeSearchTerm("mug,sku.eq.1)")).toBe("mug sku.eq.1");
    expect(safeSearchTerm(undefined)).toBe("");
  });
});

describe("formatMoney", () => {
  it("uses each currency's symbol and decimals", () => {
    expect(formatMoney(1234.5, "USD")).toBe("$1,234.50");
    expect(formatMoney(1234.5, "JPY")).toBe("¥1,235");
    expect(formatMoney("99.9", "GBP")).toBe("£99.90");
    expect(formatMoney(10, "EUR")).toBe("€10.00");
    expect(formatMoney(10, "INR")).toBe("₹10.00");
    expect(formatMoney(10, "SGD")).toMatch(/^SGD\s10\.00$/); // Intl uses a non-breaking space
    expect(formatMoney(null, "USD")).toBe("—");
  });
});

describe("friendlyDbError", () => {
  it("maps insufficient stock with the available amount", () => {
    expect(friendlyDbError({ code: "P0001", message: "INSUFFICIENT_STOCK", details: "available=3" }, "t")).toBe(
      "Not enough stock. Only 3 available right now.",
    );
  });
  it("maps duplicate SKU and barcode", () => {
    expect(friendlyDbError({ code: "23505", message: 'duplicate key value violates unique constraint "products_workspace_sku_key"' }, "t")).toMatch(/SKU/);
    expect(friendlyDbError({ code: "23505", message: 'duplicate key value violates unique constraint "products_workspace_barcode_key"' }, "t")).toMatch(
      /barcode/,
    );
  });
});
