import { useEffect, useMemo, useState } from "react";
import { LogOut } from "lucide-react";
import type { DebugState, OrderSummary, OutboxEvent } from "../api/opsApi";
import { opsApi } from "../api/opsApi";
import {
  DEBUG_STATE_UPDATED,
  createOpsLiveSocket,
} from "../api/opsLive";
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

type DebugPageProps = {
  accessToken: string;
  userLabel: string;
  onLogout: () => void;
};

export function DebugPage({
  accessToken,
  userLabel,
  onLogout,
}: DebugPageProps) {
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
      const nextState = await opsApi.getDebugState(accessToken);
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
      await opsApi.republishOutboxEvent(accessToken, eventId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Re-publish failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const socket = createOpsLiveSocket(accessToken);

    void refresh();
    socket.on(DEBUG_STATE_UPDATED, () => {
      void refresh();
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken]);

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
        <div className="flex flex-col gap-3 sm:items-end">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600">
              {userLabel}
            </span>
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm ring-1 ring-gray-300 transition hover:bg-gray-50"
              onClick={onLogout}
              type="button"
            >
              <LogOut size={18} aria-hidden="true" />
              Sign out
            </button>
          </div>
          {error && (
            <p className="max-w-xl rounded-md border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-600">
              {error}
            </p>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-7xl">
        <DebugControls
          busy={busy}
          onSuccess={() =>
            runScenario(() => opsApi.createOrderSuccess(accessToken))
          }
          onPaymentFailure={() =>
            runScenario(() => opsApi.createOrderPaymentFailure(accessToken))
          }
          onEnrollmentFailure={() =>
            runScenario(() => opsApi.createOrderEnrollmentFailure(accessToken))
          }
        />

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.55fr)]">
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
