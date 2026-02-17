import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Product, CreateOrderItemDto } from '../types';

interface LineItem extends CreateOrderItemDto {
  key: number;
}

let nextKey = 0;
function newLine(): LineItem {
  return { key: nextKey++, productId: 0, quantity: 1 };
}

export default function NewOrderPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [items, setItems] = useState<LineItem[]>([newLine()]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getProducts().then(setProducts).catch(() => setError('Failed to load products'));
  }, []);

  function updateItem(key: number, patch: Partial<CreateOrderItemDto>) {
    setItems(prev => prev.map(i => (i.key === key ? { ...i, ...patch } : i)));
  }

  function removeItem(key: number) {
    setItems(prev => prev.filter(i => i.key !== key));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    if (items.some(i => i.productId === 0)) {
      setError('Please select a product for every line item.');
      setSubmitting(false);
      return;
    }

    try {
      const order = await api.createOrder({
        customerName,
        items: items.map(({ productId, quantity }) => ({ productId, quantity })),
      });
      navigate(`/orders/${order.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  }

  function stockFor(productId: number) {
    return products.find(p => p.id === productId)?.quantityOnHand;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">New Order</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name</label>
          <input
            required
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
          />
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-500 uppercase mb-3">Line Items</h2>

          {items.map(item => {
            const stock = stockFor(item.productId);
            const overStock = stock !== undefined && item.quantity > stock;
            return (
              <div key={item.key} className="flex items-end gap-3 mb-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Product</label>
                  <select
                    required
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                    value={item.productId}
                    onChange={e => updateItem(item.key, { productId: +e.target.value })}
                  >
                    <option value={0} disabled>Select a product</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Qty</label>
                  <input
                    type="number"
                    min={1}
                    required
                    className={`w-full rounded border px-2 py-1.5 text-sm ${overStock ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                    value={item.quantity}
                    onChange={e => updateItem(item.key, { quantity: +e.target.value })}
                  />
                </div>
                <div className="w-24 text-xs text-slate-500 pb-1.5">
                  {stock !== undefined && `Available: ${stock}`}
                  {overStock && <span className="block text-red-600 font-medium">Exceeds stock</span>}
                </div>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(item.key)} className="rounded bg-red-100 px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200">
                    Remove
                  </button>
                )}
              </div>
            );
          })}

          <button type="button" onClick={() => setItems([...items, newLine()])} className="mt-1 rounded bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200">
            + Add Item
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={submitting} className="rounded bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {submitting ? 'Creating...' : 'Create Order'}
          </button>
          <button type="button" onClick={() => navigate('/orders')} className="rounded bg-slate-200 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
