export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="space-y-5">
      <div className="skeleton h-28 rounded-[1.75rem]" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-32 rounded-[1.5rem]" />
        ))}
      </div>
      <div className="skeleton h-72 rounded-[1.75rem]" />
    </div>
  );
}
