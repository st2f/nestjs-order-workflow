import type { TimelineEvent } from "../api/opsApi";

type OrderTimelineProps = {
  events: TimelineEvent[];
};

export function OrderTimeline({ events }: OrderTimelineProps) {
  return (
    <section className="rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
      <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-6">
        <h2 className="text-base font-semibold text-gray-950">Timeline</h2>
        <span className="text-sm text-gray-500">Selected order</span>
      </header>
      <div className="space-y-4 px-4 py-4 sm:px-6">
        {events.map((event) => (
          <article
            key={event.id}
            className="border-l-4 border-emerald-700 pl-4"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <strong className="text-sm font-semibold text-gray-950">
                {event.type}
              </strong>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                {event.status}
              </span>
            </div>
            <time className="mt-1 block text-xs text-gray-500">
              {event.createdAt}
            </time>
            {event.error && (
              <p className="mt-2 text-sm font-medium text-red-700">
                {event.error}
              </p>
            )}
          </article>
        ))}
        {events.length === 0 && (
          <p className="py-2 text-sm text-gray-500">Select an order.</p>
        )}
      </div>
    </section>
  );
}
