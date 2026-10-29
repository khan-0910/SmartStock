import { AppNav } from "@/components/app-nav";
import { SmoothScroll } from "@/components/smooth-scroll";
import { getContext } from "@/lib/auth";
import { signOut } from "../(auth)/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getContext();
  return (
    <div className="min-h-dvh bg-paper">
      <SmoothScroll />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <AppNav workspaceName={ctx.workspace.name} email={ctx.user.email} signOutAction={signOut} />
      <main id="main" className="relative lg:pl-60">
        {/* Soft colour wash behind every app page. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-80 bg-[radial-gradient(40rem_16rem_at_90%_0%,rgba(201,184,255,0.45),transparent_70%),radial-gradient(30rem_14rem_at_10%_0%,rgba(215,247,91,0.35),transparent_70%)]"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
