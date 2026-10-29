"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
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
