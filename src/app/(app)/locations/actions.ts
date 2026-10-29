"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getContext, isOwner } from "@/lib/auth";
import { dbErrorCode, friendlyDbError } from "@/lib/errors";
import type { ActionState } from "@/lib/types";
import { fieldErrors, formFields, isUuid, locationSchema } from "@/lib/validation";

/** Create (locationId = null) or update a location. */
export async function saveLocation(locationId: string | null, _prev: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await getContext();
  const raw = formFields(form, ["code", "name", "description"]);
  if (!isOwner(ctx)) return { status: "error", message: "Only workspace owners can manage locations.", values: raw };
  if (locationId !== null && !isUuid(locationId)) return { status: "error", message: "Invalid location." };

  const parsed = locationSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error), values: raw };
  }

  const { data, error } =
    locationId === null
      ? await ctx.supabase.from("locations").insert({ ...parsed.data, workspace_id: ctx.workspace.id }).select("id").single()
      : await ctx.supabase.from("locations").update(parsed.data).eq("id", locationId).select("id").single();

  if (error || !data) {
    const message = error ? friendlyDbError(error, "saveLocation") : "Location not found.";
    if (error && dbErrorCode(error) === "DUPLICATE_LOCATION_CODE") return { status: "error", message, fieldErrors: { code: message }, values: raw };
    return { status: "error", message, values: raw };
  }

  revalidatePath("/", "layout");
  if (locationId !== null) redirect("/locations?saved=1");
  return { status: "success", message: `Location ${parsed.data.code} added.` };
}

/**
 * Deactivate or reactivate. Locations are never deleted because products and
 * history reference them; inactive locations cannot be newly assigned.
 */
export async function setLocationActive(locationId: string, active: boolean): Promise<ActionState> {
  const ctx = await getContext();
  if (!isOwner(ctx)) return { status: "error", message: "Only workspace owners can manage locations." };
  if (!isUuid(locationId)) return { status: "error", message: "Invalid location." };
  const { data, error } = await ctx.supabase.from("locations").update({ is_active: active }).eq("id", locationId).select("code").maybeSingle();
  if (error) return { status: "error", message: friendlyDbError(error, "setLocationActive") };
  if (!data) return { status: "error", message: "Location not found." };
  revalidatePath("/", "layout");
  return { status: "success", message: active ? `${data.code} reactivated.` : `${data.code} deactivated.` };
}
