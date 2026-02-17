import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Order, OrderStatus } from '../types';
import StatusBadge from '../components/StatusBadge';

const TABS: (OrderStatus | undefined)[] = [undefined, 'Pending', 'Processing', 'Shipped', 'Delivered'];
const TAB_LABELS: Record<string, string> = { '': 'All', Pending: 'Pending', Processing: 'Processing', Shipped: 'Shipped', Delivered: 'Delivered' };

export default function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<OrderStatus | undefined>(undefined);

  async function load(status?: OrderStatus) {
    setLoading(true);
    try {
      setOrders(await api.getOrders(status));
      setError('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(filter); }, [filter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Orders</h1>
        <button onClick={() => navigate('/orders/new')} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          New Order
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4">
        {TABS.map(t => (
          <button
            key={t ?? 'all'}
            onClick={() => setFilter(t)}
            className={`rounded px-3 py-1.5 text-sm font-medium transition ${
              filter === t ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            {TAB_LABELS[t ?? '']}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : orders.length === 0 ? (
        <p className="text-slate-500">No orders found.</p>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Items</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map(o => (
                <tr key={o.id} onClick={() => navigate(`/orders/${o.id}`)} className="cursor-pointer hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium">{o.id}</td>
                  <td className="px-4 py-2">{o.customerName}</td>
                  <td className="px-4 py-2"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-2 text-slate-600">{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2">{o.items.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
