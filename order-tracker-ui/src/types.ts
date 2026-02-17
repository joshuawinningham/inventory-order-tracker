export type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Delivered';

export interface Product {
  id: number;
  name: string;
  sku: string;
  quantityOnHand: number;
  reorderThreshold: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  product?: Product;
}

export interface StatusHistory {
  id: number;
  orderId: number;
  oldStatus: OrderStatus;
  newStatus: OrderStatus;
  changedAt: string;
  note: string | null;
}

export interface Order {
  id: number;
  customerName: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  statusHistory: StatusHistory[];
}

export interface CreateProductDto {
  name: string;
  sku: string;
  quantityOnHand: number;
  reorderThreshold: number;
}

export interface UpdateProductDto {
  name: string;
  sku: string;
  quantityOnHand: number;
  reorderThreshold: number;
}

export interface CreateOrderItemDto {
  productId: number;
  quantity: number;
}

export interface CreateOrderDto {
  customerName: string;
  items: CreateOrderItemDto[];
}

export interface UpdateOrderStatusDto {
  note?: string;
}
