// ─── Product ──────────────────────────────────────────────
export interface Product {
  id: string;
  barcode: string;
  name: string;
  nameEn?: string;
  price: number;
  unit: string;
  stock: number;
  category: string;
  emoji: string;
  updatedAt: string;
}

// ─── Cart ──────────────────────────────────────────────────
export interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

// ─── Payment ───────────────────────────────────────────────
export type PaymentMethod = 'cash' | 'qr';

export interface PaymentInfo {
  method: PaymentMethod;
  received?: number;
  change?: number;
}

// ─── Order / Bill ──────────────────────────────────────────
export type OrderStatus = 'completed' | 'pending_sync' | 'synced' | 'voided';

export interface OrderItem {
  productId: string;
  productName: string;
  barcode: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: string;
  billNumber: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  cashReceived?: number;
  change?: number;
  status: OrderStatus;
  createdAt: string;
  syncedAt?: string;
}

// ─── Sync ──────────────────────────────────────────────────
export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  message: string;
}

// ─── Scanner ───────────────────────────────────────────────
export interface ScanResult {
  type: string;
  data: string;
}

// ─── App State ─────────────────────────────────────────────
export interface AppState {
  cart: CartItem[];
  discount: number;
  isScanning: boolean;
  lastSyncAt?: string;
}
