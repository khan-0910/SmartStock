import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

/**
 * Verified user + workspace for this request. The user comes from Supabase
 * Auth (getUser validates the token with the auth server); the workspace from
 * the idempotent ensure_workspace() RPC. Never from browser input.
 */
export const getContext = cache(async () => {
  const supabase = await createClient();
  // Both calls carry the same session token, so run them together (one
  // network round trip instead of two). The workspace result is only used
  // once getUser has verified that token.
  const [
    {
      data: { user },
    },
    { data, error },
  ] = await Promise.all([supabase.auth.getUser(), supabase.rpc("ensure_workspace").single()]);
  if (!user) redirect("/login");

  if (error || !data) {
    console.error("ensure_workspace failed", error?.code, error?.message);
    throw new Error("Could not load your workspace. Check that the database migrations have been applied.");
  }
  const ws = data as { workspace_id: string; workspace_name: string; role: Role };

  return {
    supabase,
    user: { id: user.id, email: user.email ?? "" },
    workspace: { id: ws.workspace_id, name: ws.workspace_name, role: ws.role },
  };
});

export type AppContext = Awaited<ReturnType<typeof getContext>>;

export function isOwner(ctx: AppContext) {
  return ctx.workspace.role === "owner";
}
