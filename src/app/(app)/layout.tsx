import { AppNav } from "@/components/app-nav";
import { SmoothScroll } from "@/components/smooth-scroll";
import { getContext } from "@/lib/auth";
import { signOut } from "../(auth)/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getContext();
  return (
    <div className="min-h-dvh bg-canvas">
      <SmoothScroll />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <AppNav workspaceName={ctx.workspace.name} email={ctx.user.email} role={ctx.workspace.role} signOutAction={signOut} />
      <main id="main" className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
