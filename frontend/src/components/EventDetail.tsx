import type { OutboxEvent } from "../api/opsApi";

type EventDetailProps = {
  event?: OutboxEvent;
  onClose: () => void;
};

export function EventDetail({ event, onClose }: EventDetailProps) {
  if (!event) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-gray-950/40 p-4"
      role="presentation"
    >
      <dialog
        className="w-full max-w-3xl overflow-hidden rounded-lg bg-white p-0 shadow-2xl"
        open
        aria-labelledby="event-detail-title"
      >
        <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-6">
          <h2
            className="break-all text-base font-semibold text-gray-950"
            id="event-detail-title"
          >
            {event.type}
          </h2>
          <button
            className="inline-flex min-h-9 items-center rounded-md bg-white px-3 text-sm font-semibold text-gray-800 shadow-sm ring-1 ring-gray-300 transition hover:bg-gray-50"
            onClick={onClose}
          >
            Close
          </button>
        </header>
        <pre className="max-h-[65vh] overflow-auto bg-gray-950 p-4 text-sm text-gray-100">
          test
          {JSON.stringify(event.payload, null, 2)}
        </pre>
      </dialog>
    </div>
  );
}
