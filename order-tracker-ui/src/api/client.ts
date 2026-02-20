import type {
  Product,
  Order,
  StatusHistory,
  CreateProductDto,
  UpdateProductDto,
  CreateOrderDto,
  UpdateOrderStatusDto,
  OrderStatus,
} from '../types';

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5239') + '/api';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const text = await res.text();
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = JSON.parse(text);
      if (body.message) {
        message = body.message;
      } else if (body.errors) {
        message = Object.values(body.errors).flat().join(' ');
      } else if (body.title) {
        message = body.title;
      }
    } catch {
      if (text) message = text;
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Products
  getProducts: () => request<Product[]>(`${BASE}/products`),
  getProduct: (id: number) => request<Product>(`${BASE}/products/${id}`),
  createProduct: (dto: CreateProductDto) =>
    request<Product>(`${BASE}/products`, { method: 'POST', body: JSON.stringify(dto) }),
  updateProduct: (id: number, dto: UpdateProductDto) =>
    request<Product>(`${BASE}/products/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  getLowStockProducts: () => request<Product[]>(`${BASE}/products/low-stock`),

  // Orders
  getOrders: (status?: OrderStatus) => {
    const url = status ? `${BASE}/orders?status=${status}` : `${BASE}/orders`;
    return request<Order[]>(url);
  },
  getOrder: (id: number) => request<Order>(`${BASE}/orders/${id}`),
  createOrder: (dto: CreateOrderDto) =>
    request<Order>(`${BASE}/orders`, { method: 'POST', body: JSON.stringify(dto) }),
  advanceStatus: (id: number, dto?: UpdateOrderStatusDto) =>
    request<Order>(`${BASE}/orders/${id}/status`, { method: 'PUT', body: JSON.stringify(dto ?? {}) }),
  getOrderHistory: (id: number) =>
    request<StatusHistory[]>(`${BASE}/orders/${id}/history`),
};
