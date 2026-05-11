import { RotateCcw } from 'lucide-react';
import type { OutboxEvent } from '../api/opsApi';

type OutboxListProps = {
  events: OutboxEvent[];
  onRepublish: (eventId: string) => void;
  onShowDetail: (event: OutboxEvent) => void;
};

export function OutboxList({
  events,
  onRepublish,
  onShowDetail,
}: OutboxListProps) {
  return (
    <section className="mt-6 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
      <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-6">
        <h2 className="text-base font-semibold text-gray-950">Outbox</h2>
        <span className="text-sm text-gray-500">Last 10</span>
      </header>
      <div>
        <div className="hidden grid-cols-[minmax(12rem,1fr)_minmax(10rem,0.85fr)_minmax(8rem,0.65fr)_minmax(7rem,0.5fr)_minmax(14rem,1fr)_minmax(9rem,0.7fr)] gap-4 bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600 lg:grid sm:px-6">
          <span>Id</span>
          <span>Type</span>
          <span>Status</span>
          <span>Retries</span>
          <span>Last error</span>
          <span>Actions</span>
        </div>
        {events.map((event) => (
          <div
            key={event.id}
            className="grid gap-3 border-t border-gray-100 px-4 py-4 text-sm sm:px-6 lg:grid-cols-[minmax(12rem,1fr)_minmax(10rem,0.85fr)_minmax(8rem,0.65fr)_minmax(7rem,0.5fr)_minmax(14rem,1fr)_minmax(9rem,0.7fr)] lg:gap-4 lg:py-3"
          >
            <div className="min-w-0">
              <span className="block text-xs font-semibold uppercase text-gray-500 lg:hidden">
                Id
              </span>
              <span className="break-all font-medium text-gray-950">
                {event.id}
              </span>
            </div>
            <div className="min-w-0">
              <span className="block text-xs font-semibold uppercase text-gray-500 lg:hidden">
                Type
              </span>
              <span className="break-all text-gray-700">{event.type}</span>
            </div>
            <div>
              <span className="mb-1 block text-xs font-semibold uppercase text-gray-500 lg:hidden">
                Status
              </span>
              <strong className="w-fit rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200">
                {event.status}
              </strong>
            </div>
            <div>
              <span className="block text-xs font-semibold uppercase text-gray-500 lg:hidden">
                Retries
              </span>
              <span className="text-gray-600">{event.retryCount}</span>
            </div>
            <div className="min-w-0">
              <span className="block text-xs font-semibold uppercase text-gray-500 lg:hidden">
                Last error
              </span>
              <span className="break-all text-gray-600">
                {event.lastError ?? '-'}
              </span>
            </div>
            <div className="inline-flex gap-2">
              <button
                className="inline-flex size-9 items-center justify-center rounded-md bg-white text-gray-700 shadow-sm ring-1 ring-gray-300 transition hover:bg-gray-50"
                title="Re-publish"
                onClick={() => onRepublish(event.id)}
              >
                <RotateCcw size={17} aria-hidden="true" />
              </button>
              <button
                className="inline-flex min-h-9 items-center rounded-md bg-white px-3 text-sm font-semibold text-gray-800 shadow-sm ring-1 ring-gray-300 transition hover:bg-gray-50"
                onClick={() => onShowDetail(event)}
              >
                Detail
              </button>
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <p className="px-4 py-6 text-sm text-gray-500 sm:px-6">
            No outbox events yet.
          </p>
        )}
      </div>
    </section>
  );
}
