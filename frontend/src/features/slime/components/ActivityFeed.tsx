export const ActivityFeed = () => {
  return (
    <section className="rounded-xl border-2 border-gb-border bg-gb-panel p-4 shadow-gbInner" aria-label="Recent activity">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-display text-lg leading-relaxed text-gb-text sm:text-xl">Recent Activity</h3>
        <button
          type="button"
          className="rounded-lg border-2 border-gb-border bg-gb-bg px-3 py-2 font-sans text-base font-semibold text-gb-text transition hover:bg-gb-bgDark active:translate-y-px sm:text-lg"
        >
          View all {'\u{2192}'}
        </button>
      </div>

      <div className="mt-4 rounded-lg border-2 border-gb-border bg-gb-bg/70 p-6 text-center">
        <p className="font-display text-lg leading-relaxed text-gb-text sm:text-xl">No activity yet</p>
        <p className="mt-2 font-sans text-base text-gb-text sm:text-lg">Complete a focus session to get started.</p>
      </div>
    </section>
  );
};
