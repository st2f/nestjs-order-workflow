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
    <section className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
      <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-6">
        <h2 className="text-base font-semibold text-gray-950">Orders</h2>
        <span className="text-sm text-gray-500">Last 10</span>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[42rem] table-fixed text-left">
          <colgroup>
            <col className="w-[44%]" />
            <col className="w-[36%]" />
            <col className="w-[20%]" />
          </colgroup>
          <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-600">
            <tr>
              <th className="px-4 py-3 sm:px-6">Id</th>
              <th className="px-4 py-3 sm:px-6">Course</th>
              <th className="px-4 py-3 sm:px-6">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {orders.map((order) => (
              <tr
                key={order.id}
                className="group"
              >
                <td
                  className={`px-4 py-3 sm:px-6 ${
                    selectedOrderId === order.id
                      ? 'bg-emerald-50'
                      : 'bg-white group-hover:bg-gray-50'
                  }`}
                >
                  <button
                    className="block w-full break-all text-left font-medium text-gray-950"
                    onClick={() => onSelect(order.id)}
                  >
                    {order.id}
                  </button>
                </td>
                <td
                  className={`break-all px-4 py-3 text-gray-600 sm:px-6 ${
                    selectedOrderId === order.id
                      ? 'bg-emerald-50'
                      : 'bg-white group-hover:bg-gray-50'
                  }`}
                >
                  {order.courseId}
                </td>
                <td
                  className={`px-4 py-3 sm:px-6 ${
                    selectedOrderId === order.id
                      ? 'bg-emerald-50'
                      : 'bg-white group-hover:bg-gray-50'
                  }`}
                >
                  <strong
                    className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClassName(
                      order.status,
                    )}`}
                  >
                    {order.status}
                  </strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && (
          <p className="px-4 py-6 text-sm text-gray-500 sm:px-6">
            No orders yet.
          </p>
        )}
      </div>
    </section>
  );
}

function statusClassName(status: string): string {
  switch (status) {
    case 'COMPLETED':
      return 'bg-emerald-50 text-emerald-800 ring-emerald-200';
    case 'PAID':
      return 'bg-blue-50 text-blue-800 ring-blue-200';
    case 'REFUND_IN_PROGRESS':
      return 'bg-amber-50 text-amber-800 ring-amber-200';
    case 'REFUNDED':
      return 'bg-slate-100 text-slate-700 ring-slate-200';
    case 'PAYMENT_FAILED':
    case 'FAILED':
      return 'bg-red-50 text-red-800 ring-red-200';
    default:
      return 'bg-gray-100 text-gray-700 ring-gray-200';
  }
}
