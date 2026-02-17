import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Product, Order } from '../types';
import StatusBadge from '../components/StatusBadge';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.getProducts(), api.getOrders(), api.getLowStockProducts()])
      .then(([p, o, ls]) => { setProducts(p); setOrders(o); setLowStock(ls); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load dashboard data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-slate-500">Loading...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  const pendingCount = orders.filter(o => o.status === 'Pending').length;
  const recentOrders = orders.slice(0, 10);

  const cards = [
    { label: 'Total Products', value: products.length, color: 'bg-white' },
    { label: 'Total Orders', value: orders.length, color: 'bg-white' },
    { label: 'Pending Orders', value: pendingCount, color: 'bg-white' },
    { label: 'Low Stock Items', value: lowStock.length, color: lowStock.length > 0 ? 'bg-red-50' : 'bg-white' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {cards.map(c => (
          <div key={c.label} className={`rounded-lg ${c.color} p-4 shadow-sm`}>
            <p className="text-xs font-semibold uppercase text-slate-500">{c.label}</p>
            <p className={`mt-1 text-3xl font-bold ${c.label === 'Low Stock Items' && c.value > 0 ? 'text-red-600' : 'text-slate-900'}`}>
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Recent orders */}
        <div className="col-span-2 rounded-lg bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-500 uppercase mb-3">Recent Orders</h2>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-slate-500">No orders yet.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs font-semibold uppercase text-slate-400">
                <tr>
                  <th className="pb-2">Order #</th>
                  <th className="pb-2">Customer</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.map(o => (
                  <tr key={o.id} onClick={() => navigate(`/orders/${o.id}`)} className="cursor-pointer hover:bg-slate-50">
                    <td className="py-2 font-medium">{o.id}</td>
                    <td className="py-2">{o.customerName}</td>
                    <td className="py-2"><StatusBadge status={o.status} /></td>
                    <td className="py-2 text-slate-600">{new Date(o.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Low stock alerts */}
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-500 uppercase mb-3">Low Stock Alerts</h2>
          {lowStock.length === 0 ? (
            <p className="text-sm text-green-600">All stock healthy.</p>
          ) : (
            <ul className="space-y-2">
              {lowStock.map(p => (
                <li key={p.id} className="rounded bg-red-50 px-3 py-2 text-sm">
                  <p className="font-medium text-red-800">{p.name} <span className="text-red-500 font-normal">({p.sku})</span></p>
                  <p className="text-xs text-red-600">Qty: {p.quantityOnHand} / Threshold: {p.reorderThreshold}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
