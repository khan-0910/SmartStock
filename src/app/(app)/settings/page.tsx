import type { Metadata } from "next";
import Link from "next/link";
import { ActionButton } from "@/components/action-button";
import { buttonClass, Card, PageHeader } from "@/components/ui";
import { getContext, isOwner } from "@/lib/auth";
import { signOut } from "../../(auth)/actions";
import { loadDemoData, unloadDemoData } from "../products/actions";
import { deleteAccount } from "./actions";
import { WorkspaceForm } from "./workspace-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ctx = await getContext();
  const [{ count: demoCount }, { count: productCount }] = await Promise.all([
    ctx.supabase.from("products").select("id", { count: "exact", head: true }).eq("workspace_id", ctx.workspace.id).like("sku", "DEMO-%"),
    ctx.supabase.from("products").select("id", { count: "exact", head: true }).eq("workspace_id", ctx.workspace.id),
  ]);
  return (
    <>
      <PageHeader
        title="Settings"
        kicker="Account"
        tone="lavender"
        description="Workspace details, currency, your data and your account."
        stats={[
          { label: "Role", value: <span className="capitalize">{ctx.workspace.role}</span> },
          { label: "Currency", value: ctx.workspace.currency },
        ]}
      />
      <div className="grid max-w-2xl gap-6">
        <Card>
          <h2 className="mb-4 font-semibold">Workspace</h2>
          {isOwner(ctx) ? <WorkspaceForm name={ctx.workspace.name} currency={ctx.workspace.currency} /> : <p className="text-sm">{ctx.workspace.name}</p>}
        </Card>
        <Card>
          <h2 className="mb-2 font-semibold">Account</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-ink/60">Email</dt>
            <dd>{ctx.user.email}</dd>
            <dt className="text-ink/60">Role</dt>
            <dd className="capitalize">{ctx.workspace.role}</dd>
          </dl>
          <form action={signOut} className="mt-4">
            <button type="submit" className={buttonClass("secondary")}>
              Sign out
            </button>
          </form>
        </Card>
        <Card>
          <h2 className="mb-1 font-semibold">Your data</h2>
          <p className="text-sm text-ink/70">
            Download everything in your workspace (products, locations and full movement history) as a JSON file. See the{" "}
            <Link href="/privacy" className="font-semibold underline">Privacy Policy</Link> for how data is handled.
          </p>
          <a href="/api/account/export" download className={buttonClass("secondary", "mt-4")}>
            Download my data
          </a>
        </Card>
        {isOwner(ctx) && (
          <Card>
            <h2 className="mb-1 font-semibold">Demo data</h2>
            {demoCount ? (
              <>
                <p className="mb-4 text-sm text-ink/70">
                  Your workspace has {demoCount} demo products. Removing them also deletes their movement history and any demo locations nothing
                  else uses. Your own products and locations are kept.
                </p>
                <ActionButton
                  action={unloadDemoData}
                  label="Remove demo data"
                  pendingLabel="Removing…"
                  confirm={{ title: "Remove demo data?", body: "The 10 demo products and their history will be deleted. This cannot be undone.", confirmLabel: "Remove demo data", danger: true }}
                />
              </>
            ) : productCount ? (
              <p className="text-sm text-ink/70">No demo data in this workspace. Demo data can only be loaded into an empty workspace.</p>
            ) : (
              <>
                <p className="mb-4 text-sm text-ink/70">Load 10 fictional products, 4 locations and sample movements to explore the app.</p>
                <ActionButton action={loadDemoData} label="Load demo data" pendingLabel="Loading…" />
              </>
            )}
          </Card>
        )}
        <Card className="border-coral/40">
          <h2 className="mb-1 font-semibold text-coral">Delete account</h2>
          <p className="mb-4 text-sm text-ink/70">
            Permanently deletes your login and every workspace you own, including all products, locations and stock history. This cannot be
            undone. Download your data first if you want a copy.
          </p>
          <ActionButton
            action={deleteAccount}
            label="Delete my account"
            pendingLabel="Deleting…"
            variant="danger"
            confirm={{
              title: "Delete your account permanently?",
              body: `This erases ${ctx.user.email}, your workspace “${ctx.workspace.name}” and all of its inventory history. There is no undo.`,
              confirmLabel: "Yes, delete everything",
              danger: true,
            }}
          />
        </Card>
      </div>
    </>
  );
}
