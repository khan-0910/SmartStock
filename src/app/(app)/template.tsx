// Re-mounts on every navigation, so each page plays its entrance:
// the page fades/lifts in and its top-level blocks follow in a stagger.
// Pure CSS (compositor-only), disabled for reduced-motion users.
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter stagger">{children}</div>;
}
