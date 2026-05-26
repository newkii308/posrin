import * as SQLite from 'expo-sqlite';
import { Order, OrderItem, OrderStatus } from '../types';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('pos_store.db');
  }
  return db;
}

// ─── Init Schema ───────────────────────────────────────────
export async function initDB(): Promise<void> {
  const database = await getDB();

  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      bill_number TEXT NOT NULL UNIQUE,
      subtotal REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'cash',
      cash_received REAL,
      change REAL,
      status TEXT NOT NULL DEFAULT 'pending_sync',
      created_at TEXT NOT NULL,
      synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      barcode TEXT NOT NULL,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_items_order ON order_items(order_id);
  `);
}

// ─── Bill Number Generator ─────────────────────────────────
export async function generateBillNumber(): Promise<string> {
  const database = await getDB();
  const today = new Date();
  const prefix = `B${today.getFullYear().toString().slice(2)}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

  const result = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM orders WHERE bill_number LIKE ?`,
    [`${prefix}%`]
  );

  const seq = ((result?.count ?? 0) + 1).toString().padStart(4, '0');
  return `${prefix}-${seq}`;
}

// ─── Save Order ────────────────────────────────────────────
export async function saveOrder(order: Order): Promise<boolean> {
  const database = await getDB();

  try {
    await database.withTransactionAsync(async () => {
      await database.runAsync(
        `INSERT INTO orders (id, bill_number, subtotal, discount, total, payment_method, cash_received, change, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          order.id,
          order.billNumber,
          order.subtotal,
          order.discount,
          order.total,
          order.paymentMethod,
          order.cashReceived ?? null,
          order.change ?? null,
          order.status,
          order.createdAt,
        ]
      );

      for (const item of order.items) {
        await database.runAsync(
          `INSERT INTO order_items (order_id, product_id, product_name, barcode, price, quantity, subtotal)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [order.id, item.productId, item.productName, item.barcode, item.price, item.quantity, item.subtotal]
        );
      }
    });
    return true;
  } catch (err) {
    console.error('saveOrder error:', err);
    return false;
  }
}

// ─── Get Pending Orders ────────────────────────────────────
export async function getPendingOrders(): Promise<Order[]> {
  const database = await getDB();

  const rows = await database.getAllAsync<any>(
    `SELECT o.*, GROUP_CONCAT(oi.product_id || '|' || oi.product_name || '|' || oi.barcode || '|' || oi.price || '|' || oi.quantity || '|' || oi.subtotal, ';;') as items_raw
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.status = 'pending_sync'
     GROUP BY o.id
     ORDER BY o.created_at ASC
     LIMIT 50`
  );

  return rows.map(rowToOrder);
}

// ─── Get Recent Orders ─────────────────────────────────────
export async function getRecentOrders(limit = 20): Promise<Order[]> {
  const database = await getDB();

  const rows = await database.getAllAsync<any>(
    `SELECT o.*, GROUP_CONCAT(oi.product_id || '|' || oi.product_name || '|' || oi.barcode || '|' || oi.price || '|' || oi.quantity || '|' || oi.subtotal, ';;') as items_raw
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     GROUP BY o.id
     ORDER BY o.created_at DESC
     LIMIT ?`,
    [limit]
  );

  return rows.map(rowToOrder);
}

// ─── Mark Synced ───────────────────────────────────────────
export async function markOrderSynced(orderId: string): Promise<void> {
  const database = await getDB();
  await database.runAsync(
    `UPDATE orders SET status = 'synced', synced_at = ? WHERE id = ?`,
    [new Date().toISOString(), orderId]
  );
}

// ─── Daily Stats ───────────────────────────────────────────
export async function getDailyStats(): Promise<{ count: number; total: number }> {
  const database = await getDB();
  const today = new Date().toISOString().split('T')[0];

  const result = await database.getFirstAsync<{ count: number; total: number }>(
    `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
     FROM orders
     WHERE created_at LIKE ? AND status != 'voided'`,
    [`${today}%`]
  );

  return { count: result?.count ?? 0, total: result?.total ?? 0 };
}

// ─── Row Mapper ────────────────────────────────────────────
function rowToOrder(row: any): Order {
  const items: OrderItem[] = row.items_raw
    ? row.items_raw.split(';;').map((s: string) => {
        const [productId, productName, barcode, price, quantity, subtotal] = s.split('|');
        return {
          productId,
          productName,
          barcode,
          price: parseFloat(price),
          quantity: parseInt(quantity, 10),
          subtotal: parseFloat(subtotal),
        };
      })
    : [];

  return {
    id: row.id,
    billNumber: row.bill_number,
    items,
    subtotal: row.subtotal,
    discount: row.discount,
    total: row.total,
    paymentMethod: row.payment_method as any,
    cashReceived: row.cash_received ?? undefined,
    change: row.change ?? undefined,
    status: row.status as OrderStatus,
    createdAt: row.created_at,
    syncedAt: row.synced_at ?? undefined,
  };
}
