import type { OrderSummary } from '../api/opsApi';

type OrdersListProps = {
  orders: OrderSummary[];
  selectedOrderId?: string;
  onSelect: (orderId: string) => void;
};

export function OrdersList({
  orders,
  selectedOrderId,
  onSelect,
}: OrdersListProps) {
  return (
    <section className="panel">
      <header className="panel-header">
        <h2>Orders</h2>
        <span>Last 10</span>
      </header>
      <div className="table">
        <div className="table-row table-head">
          <span>id</span>
          <span>courseId</span>
          <span>status</span>
        </div>
        {orders.map((order) => (
          <button
            key={order.id}
            className={`table-row selectable ${
              selectedOrderId === order.id ? 'selected' : ''
            }`}
            onClick={() => onSelect(order.id)}
          >
            <span>{order.id}</span>
            <span>{order.courseId}</span>
            <strong>{order.status}</strong>
          </button>
        ))}
        {orders.length === 0 && <p className="empty">No orders yet.</p>}
      </div>
    </section>
  );
}
