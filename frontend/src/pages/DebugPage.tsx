import { useEffect, useMemo, useState } from 'react';
import type { DebugState, OrderSummary, OutboxEvent } from '../api/opsApi';
import { opsApi } from '../api/opsApi';
import { DebugControls } from '../components/DebugControls';
import { EventDetail } from '../components/EventDetail';
import { OrdersList } from '../components/OrdersList';
import { OrderTimeline } from '../components/OrderTimeline';
import { OutboxList } from '../components/OutboxList';

const emptyState: DebugState = {
  orders: [],
  timeline: [],
  outbox: [],
};

export function DebugPage() {
  const [state, setState] = useState<DebugState>(emptyState);
  const [selectedOrderId, setSelectedOrderId] = useState<string>();
  const [selectedEvent, setSelectedEvent] = useState<OutboxEvent>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const selectedTimeline = useMemo(() => {
    if (!selectedOrderId) {
      return state.timeline;
    }

    return state.timeline.filter((event) => event.id.includes(selectedOrderId));
  }, [selectedOrderId, state.timeline]);

  async function refresh() {
    try {
      setError(undefined);
      const nextState = await opsApi.getDebugState();
      setState(nextState);
      setSelectedOrderId((current) => current ?? nextState.selectedOrderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load debug state');
    }
  }

  async function runScenario(action: () => Promise<OrderSummary>) {
    setBusy(true);
    try {
      const order = await action();
      setSelectedOrderId(order.id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scenario failed');
    } finally {
      setBusy(false);
    }
  }

  async function republish(eventId: string) {
    setBusy(true);
    try {
      await opsApi.republishOutboxEvent(eventId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Re-publish failed');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <main>
      <header className="app-header">
        <div>
          <h1>OrderFlow Debug</h1>
          <p>Workflow scenarios, timelines, outbox replay.</p>
        </div>
        {error && <p className="notice">{error}</p>}
      </header>

      <DebugControls
        busy={busy}
        onSuccess={() => runScenario(opsApi.createOrderSuccess)}
        onPaymentFailure={() => runScenario(opsApi.createOrderPaymentFailure)}
        onEnrollmentFailure={() =>
          runScenario(opsApi.createOrderEnrollmentFailure)
        }
      />

      <div className="layout">
        <OrdersList
          orders={state.orders}
          selectedOrderId={selectedOrderId}
          onSelect={setSelectedOrderId}
        />
        <OrderTimeline events={selectedTimeline} />
      </div>

      <OutboxList
        events={state.outbox}
        onRepublish={republish}
        onShowDetail={setSelectedEvent}
      />
      <EventDetail event={selectedEvent} onClose={() => setSelectedEvent(undefined)} />
    </main>
  );
}
