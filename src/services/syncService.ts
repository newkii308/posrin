import { getPendingOrders, markOrderSynced } from '../database/db';
import { Order, SyncResult } from '../types';

// เปลี่ยน URL นี้เป็น server จริง
const SERVER_URL = 'https://your-server.com/api/pos/sync';

// ─── Check Network ─────────────────────────────────────────
async function isOnline(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch('https://www.google.com', {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Sync Single Order ─────────────────────────────────────
async function syncOrder(order: Order): Promise<boolean> {
  try {
    const response = await fetch(SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-ID': 'pos-device-001',
      },
      body: JSON.stringify(order),
    });

    if (response.ok) {
      await markOrderSynced(order.id);
      return true;
    }
    return false;
  } catch (err) {
    console.warn(`syncOrder failed for ${order.id}:`, err);
    return false;
  }
}

// ─── Sync All Pending ──────────────────────────────────────
export async function syncPendingOrders(): Promise<SyncResult> {
  const online = await isOnline();
  if (!online) {
    return {
      success: false,
      synced: 0,
      failed: 0,
      message: 'ไม่มีการเชื่อมต่ออินเทอร์เน็ต',
    };
  }

  const pending = await getPendingOrders();
  if (pending.length === 0) {
    return {
      success: true,
      synced: 0,
      failed: 0,
      message: 'ไม่มีข้อมูลที่ต้อง sync',
    };
  }

  let synced = 0;
  let failed = 0;

  for (const order of pending) {
    const ok = await syncOrder(order);
    if (ok) synced++;
    else failed++;
  }

  return {
    success: failed === 0,
    synced,
    failed,
    message:
      failed === 0
        ? `sync สำเร็จ ${synced} บิล`
        : `sync ${synced} สำเร็จ, ${failed} ล้มเหลว`,
  };
}

// ─── Auto Sync Background ──────────────────────────────────
let syncTimer: ReturnType<typeof setInterval> | null = null;

export function startAutoSync(intervalMs = 60_000): void {
  if (syncTimer) return;
  syncTimer = setInterval(async () => {
    const result = await syncPendingOrders();
    if (result.synced > 0) {
      console.log('[AutoSync]', result.message);
    }
  }, intervalMs);
}

export function stopAutoSync(): void {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}
