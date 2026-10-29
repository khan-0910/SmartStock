import { NextResponse } from "next/server";
import { getContext } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

// "Download my data": everything in the caller's workspace as JSON.
// Runs under the caller's session, so RLS limits it to their own rows.

const PAGE = 1000;

async function all<T>(fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const rows: T[] = [];
  for (let from = 0; from < 200_000; from += PAGE) {
    const { data, error } = await fetchPage(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

export async function GET() {
  const ctx = await getContext();
  if (rateLimit(`export:${ctx.user.id}:${await clientIp()}`, 5, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many exports. Try again in a few minutes." }, { status: 429 });
  }
  const ws = ctx.workspace.id;
  try {
    const [locations, products, movements] = await Promise.all([
      all((a, b) => ctx.supabase.from("locations").select("*").eq("workspace_id", ws).order("created_at").range(a, b)),
      all((a, b) => ctx.supabase.from("products").select("*").eq("workspace_id", ws).order("created_at").range(a, b)),
      all((a, b) => ctx.supabase.from("stock_movements").select("*").eq("workspace_id", ws).order("created_at").range(a, b)),
    ]);
    const body = {
      exported_at: new Date().toISOString(),
      account: { id: ctx.user.id, email: ctx.user.email },
      workspace: ctx.workspace,
      locations,
      products,
      stock_movements: movements,
    };
    return new NextResponse(JSON.stringify(body, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="smartstock-export-${new Date().toISOString().slice(0, 10)}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[export]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Export failed. Please try again." }, { status: 500 });
  }
}
