import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui";
import { getContext, isOwner } from "@/lib/auth";
import { signOut } from "../../(auth)/actions";
import { WorkspaceForm } from "./workspace-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ctx = await getContext();
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid max-w-2xl gap-6">
        <Card>
          <h2 className="mb-4 font-semibold">Workspace</h2>
          {isOwner(ctx) ? <WorkspaceForm name={ctx.workspace.name} /> : <p className="text-sm">{ctx.workspace.name}</p>}
        </Card>
        <Card>
          <h2 className="mb-2 font-semibold">Account</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-slate-600">Email</dt>
            <dd>{ctx.user.email}</dd>
            <dt className="text-slate-600">Role</dt>
            <dd className="capitalize">{ctx.workspace.role}</dd>
          </dl>
          <form action={signOut} className="mt-4">
            <button type="submit" className="inline-flex min-h-10 items-center rounded-lg px-4 text-sm font-semibold text-slate-800 ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
              Sign out
            </button>
          </form>
        </Card>
      </div>
    </>
  );
}
