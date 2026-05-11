import { useEffect, useMemo, useState } from "react";
import type { DebugState, OrderSummary, OutboxEvent } from "../api/opsApi";
import { opsApi } from "../api/opsApi";
import { DebugControls } from "../components/DebugControls";
import { EventDetail } from "../components/EventDetail";
import { OrdersList } from "../components/OrdersList";
import { OrderTimeline } from "../components/OrderTimeline";
import { OutboxList } from "../components/OutboxList";

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

    return state.timeline.filter((event) => event.orderId === selectedOrderId);
  }, [selectedOrderId, state.timeline]);

  async function refresh() {
    try {
      setError(undefined);
      const nextState = await opsApi.getDebugState();
      setState(nextState);
      setSelectedOrderId((current) => current ?? nextState.selectedOrderId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load debug state",
      );
    }
  }

  async function runScenario(action: () => Promise<OrderSummary>) {
    setBusy(true);
    try {
      const order = await action();
      setSelectedOrderId(order.id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scenario failed");
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
      setError(err instanceof Error ? err.message : "Re-publish failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void refresh();

    const interval = window.setInterval(() => {
      void refresh();
    }, 1500);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 text-gray-900 sm:px-6 lg:px-8">
      <header className="mx-auto mb-6 flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold leading-tight text-gray-950">
            OrderFlow Debug
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Workflow scenarios, timelines, outbox replay.
          </p>
        </div>
        {error && (
          <p className="max-w-xl rounded-md border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-600">
            {error}
          </p>
        )}
      </header>

      <div className="mx-auto max-w-7xl">
        <DebugControls
          busy={busy}
          onSuccess={() => runScenario(opsApi.createOrderSuccess)}
          onPaymentFailure={() => runScenario(opsApi.createOrderPaymentFailure)}
          onEnrollmentFailure={() =>
            runScenario(opsApi.createOrderEnrollmentFailure)
          }
        />

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
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
      </div>
      <EventDetail
        event={selectedEvent}
        onClose={() => setSelectedEvent(undefined)}
      />
    </main>
  );
}
