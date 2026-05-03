import type { OutboxEvent } from '../api/opsApi';

type EventDetailProps = {
  event?: OutboxEvent;
  onClose: () => void;
};

export function EventDetail({ event, onClose }: EventDetailProps) {
  if (!event) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <dialog open aria-labelledby="event-detail-title">
        <header className="dialog-header">
          <h2 id="event-detail-title">{event.type}</h2>
          <button onClick={onClose}>Close</button>
        </header>
        <pre>{JSON.stringify(event.payload, null, 2)}</pre>
      </dialog>
    </div>
  );
}
