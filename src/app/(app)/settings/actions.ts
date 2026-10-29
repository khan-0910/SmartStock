"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { getContext, isOwner } from "@/lib/auth";
import { friendlyDbError } from "@/lib/errors";
import type { ActionState } from "@/lib/types";
import { fieldErrors, formFields, normalizeText } from "@/lib/validation";

const workspaceSchema = z.object({
  name: z.string().transform(normalizeText).pipe(z.string().min(1, "Name is required.").max(100, "Name must be 100 characters or fewer.")),
});

export async function renameWorkspace(_prev: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await getContext();
  const raw = formFields(form, ["name"]);
  if (!isOwner(ctx)) return { status: "error", message: "Only workspace owners can rename the workspace.", values: raw };
  const parsed = workspaceSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", message: "Please fix the highlighted field.", fieldErrors: fieldErrors(parsed.error), values: raw };
  const { error } = await ctx.supabase.from("workspaces").update({ name: parsed.data.name }).eq("id", ctx.workspace.id);
  if (error) return { status: "error", message: friendlyDbError(error, "renameWorkspace"), values: raw };
  revalidatePath("/", "layout");
  return { status: "success", message: "Workspace renamed." };
}

/** Permanently delete the caller's account and every workspace they own. */
export async function deleteAccount(): Promise<ActionState> {
  const ctx = await getContext();
  if (rateLimit(`delete:${ctx.user.id}`, 3, 10 * 60_000)) return { status: "error", message: "Too many attempts. Try again later." };
  const { error } = await ctx.supabase.rpc("delete_my_account");
  if (error) {
    if (error.message === "HAS_SHARED_HISTORY") {
      return { status: "error", message: "You recorded stock in a workspace you do not own. Ask its owner to remove you first." };
    }
    return { status: "error", message: friendlyDbError(error, "deleteAccount") };
  }
  // The auth user is gone; clear the now-invalid session cookie.
  await ctx.supabase.auth.signOut().catch(() => undefined);
  redirect("/?account=deleted");
}
