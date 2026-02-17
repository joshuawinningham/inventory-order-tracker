import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Order, OrderStatus } from '../types';
import StatusBadge from '../components/StatusBadge';
import StatusTimeline from '../components/StatusTimeline';

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  Pending: 'Processing',
  Processing: 'Shipped',
  Shipped: 'Delivered',
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [advancing, setAdvancing] = useState(false);

  async function load() {
    try {
      setOrder(await api.getOrder(Number(id)));
      setError('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function handleAdvance() {
    if (!order) return;
    setAdvancing(true);
    try {
      const updated = await api.advanceStatus(order.id, note ? { note } : undefined);
      setOrder(updated);
      setNote('');
      // Reload to get full history
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to advance status');
    } finally {
      setAdvancing(false);
    }
  }

  if (loading) return <p className="text-slate-500">Loading...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!order) return <p className="text-slate-500">Order not found.</p>;

  const next = NEXT_STATUS[order.status];

  return (
    <div>
      <Link to="/orders" className="text-sm text-blue-600 hover:underline">&larr; Back to Orders</Link>

      <div className="mt-4 flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">Order #{order.id}</h1>
        <StatusBadge status={order.status} />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left column: details + items */}
        <div className="col-span-2 space-y-6">
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-500 uppercase mb-2">Details</h2>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-slate-500">Customer</dt>
              <dd className="font-medium">{order.customerName}</dd>
              <dt className="text-slate-500">Created</dt>
              <dd>{new Date(order.createdAt).toLocaleString()}</dd>
              <dt className="text-slate-500">Updated</dt>
              <dd>{new Date(order.updatedAt).toLocaleString()}</dd>
            </dl>
          </div>

          <div className="rounded-lg bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-500 uppercase mb-2">Items</h2>
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs font-semibold uppercase text-slate-400">
                <tr>
                  <th className="pb-2">Product</th>
                  <th className="pb-2">SKU</th>
                  <th className="pb-2">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map(item => (
                  <tr key={item.id}>
                    <td className="py-2 font-medium">{item.product?.name ?? `Product #${item.productId}`}</td>
                    <td className="py-2 text-slate-600">{item.product?.sku ?? '—'}</td>
                    <td className="py-2">{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Advance status */}
          {next && (
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-500 uppercase mb-3">Advance Status</h2>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Note (optional)</label>
                  <input
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Add a note..."
                  />
                </div>
                <button
                  onClick={handleAdvance}
                  disabled={advancing}
                  className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {advancing ? 'Updating...' : `Advance to ${next}`}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right column: timeline */}
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-500 uppercase mb-4">Status Timeline</h2>
          <StatusTimeline history={order.statusHistory} currentStatus={order.status} />
        </div>
      </div>
    </div>
  );
}
