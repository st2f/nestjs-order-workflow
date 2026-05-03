import type { TimelineEvent } from '../api/opsApi';

type OrderTimelineProps = {
  events: TimelineEvent[];
};

export function OrderTimeline({ events }: OrderTimelineProps) {
  return (
    <section className="panel">
      <header className="panel-header">
        <h2>Timeline</h2>
        <span>Selected order</span>
      </header>
      <div className="timeline">
        {events.map((event) => (
          <article key={event.id} className="timeline-event">
            <div>
              <strong>{event.type}</strong>
              <span>{event.status}</span>
            </div>
            <time>{event.createdAt}</time>
            {event.error && <p>{event.error}</p>}
          </article>
        ))}
        {events.length === 0 && <p className="empty">Select an order.</p>}
      </div>
    </section>
  );
}
