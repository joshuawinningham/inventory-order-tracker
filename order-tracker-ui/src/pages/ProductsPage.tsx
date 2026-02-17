import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Product, CreateProductDto } from '../types';

const empty: CreateProductDto = { name: '', sku: '', quantityOnHand: 0, reorderThreshold: 0 };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState<CreateProductDto>({ ...empty });
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<CreateProductDto>({ ...empty });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setProducts(await api.getProducts());
      setError('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createProduct(form);
      setForm({ ...empty });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create product');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(p: Product) {
    setEditId(p.id);
    setEditForm({ name: p.name, sku: p.sku, quantityOnHand: p.quantityOnHand, reorderThreshold: p.reorderThreshold });
  }

  async function handleSave() {
    if (editId === null) return;
    setSaving(true);
    try {
      await api.updateProduct(editId, editForm);
      setEditId(null);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update product');
    } finally {
      setSaving(false);
    }
  }

  const isLowStock = (p: Product) => p.quantityOnHand <= p.reorderThreshold;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Products</h1>

      {/* Add product form */}
      <form onSubmit={handleAdd} className="mb-6 grid grid-cols-5 gap-3 items-end bg-white p-4 rounded-lg shadow-sm">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
          <input required className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">SKU</label>
          <input required className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Qty on Hand</label>
          <input type="number" min={0} required className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={form.quantityOnHand} onChange={e => setForm({ ...form, quantityOnHand: +e.target.value })} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Reorder Threshold</label>
          <input type="number" min={0} required className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={form.reorderThreshold} onChange={e => setForm({ ...form, reorderThreshold: +e.target.value })} />
        </div>
        <button type="submit" disabled={saving} className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          Add
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : products.length === 0 ? (
        <p className="text-slate-500">No products yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Qty on Hand</th>
                <th className="px-4 py-3">Reorder Threshold</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map(p => {
                const low = isLowStock(p);
                const editing = editId === p.id;
                return (
                  <tr key={p.id} className={low ? 'bg-red-50' : ''}>
                    {editing ? (
                      <>
                        <td className="px-4 py-2"><input className="w-full rounded border border-slate-300 px-2 py-1 text-sm" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></td>
                        <td className="px-4 py-2"><input className="w-full rounded border border-slate-300 px-2 py-1 text-sm" value={editForm.sku} onChange={e => setEditForm({ ...editForm, sku: e.target.value })} /></td>
                        <td className="px-4 py-2"><input type="number" min={0} className="w-24 rounded border border-slate-300 px-2 py-1 text-sm" value={editForm.quantityOnHand} onChange={e => setEditForm({ ...editForm, quantityOnHand: +e.target.value })} /></td>
                        <td className="px-4 py-2"><input type="number" min={0} className="w-24 rounded border border-slate-300 px-2 py-1 text-sm" value={editForm.reorderThreshold} onChange={e => setEditForm({ ...editForm, reorderThreshold: +e.target.value })} /></td>
                        <td className="px-4 py-2 space-x-2">
                          <button onClick={handleSave} disabled={saving} className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50">Save</button>
                          <button onClick={() => setEditId(null)} className="rounded bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-300">Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-2 font-medium">{p.name}</td>
                        <td className="px-4 py-2 text-slate-600">{p.sku}</td>
                        <td className="px-4 py-2">
                          {p.quantityOnHand}
                          {low && <span className="ml-2 inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Low Stock</span>}
                        </td>
                        <td className="px-4 py-2">{p.reorderThreshold}</td>
                        <td className="px-4 py-2">
                          <button onClick={() => startEdit(p)} className="rounded bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-300">Edit</button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
