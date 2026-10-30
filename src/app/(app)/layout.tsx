import { AppNav } from "@/components/app-nav";
import { SmoothScroll } from "@/components/smooth-scroll";
import { getContext } from "@/lib/auth";
import { signOut } from "../(auth)/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getContext();
  return (
    <div className="app-theme isolate min-h-dvh bg-canvas text-ink">
      {/* Fixed colour splash; -z-10 inside this isolated stack = behind content, above the page colour. */}
      <div aria-hidden className="app-splash pointer-events-none fixed inset-0 -z-10" />
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
