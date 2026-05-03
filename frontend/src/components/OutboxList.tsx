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
    <section className="panel outbox">
      <header className="panel-header">
        <h2>Outbox</h2>
        <span>Last 10</span>
      </header>
      <div className="table outbox-table">
        <div className="table-row table-head">
          <span>id</span>
          <span>type</span>
          <span>status</span>
          <span>retryCount</span>
          <span>lastError</span>
          <span>actions</span>
        </div>
        {events.map((event) => (
          <div key={event.id} className="table-row">
            <span>{event.id}</span>
            <span>{event.type}</span>
            <strong>{event.status}</strong>
            <span>{event.retryCount}</span>
            <span>{event.lastError ?? '-'}</span>
            <span className="actions">
              <button
                className="icon-button"
                title="Re-publish"
                onClick={() => onRepublish(event.id)}
              >
                <RotateCcw size={17} aria-hidden="true" />
              </button>
              <button onClick={() => onShowDetail(event)}>Detail</button>
            </span>
          </div>
        ))}
        {events.length === 0 && <p className="empty">No outbox events yet.</p>}
      </div>
    </section>
  );
}
