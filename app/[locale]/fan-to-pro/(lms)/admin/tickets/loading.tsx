export default function TicketsLoading() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8 md:px-10 md:py-10 space-y-8 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300">
      <header className="space-y-2">
        <div className="h-8 w-32 rounded bg-[var(--secondary)] animate-pulse" />
        <div className="h-4 w-64 rounded bg-[var(--secondary)] animate-pulse" />
      </header>
      {[1, 2, 3].map((phase) => (
        <section key={phase} className="space-y-3">
          <div className="h-4 w-40 rounded bg-[var(--secondary)] animate-pulse" />
          <div className="border border-[var(--border)] rounded-[var(--radius)] bg-[var(--card)] divide-y divide-[var(--border)]">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <div className="h-5 w-8 rounded bg-[var(--secondary)] animate-pulse" />
                <div className="h-4 w-16 rounded bg-[var(--secondary)] animate-pulse" />
                <div className="h-4 flex-1 rounded bg-[var(--secondary)] animate-pulse" />
                <div className="h-5 w-16 rounded bg-[var(--secondary)] animate-pulse" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
