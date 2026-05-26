import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Animated,
  StatusBar,
  SafeAreaView,
  TextInput,
  Vibration,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

import { CartItem, Product, Order, PaymentMethod } from '../types';
import { findProductByBarcode, SAMPLE_PRODUCTS } from '../data/products';
import { saveOrder, generateBillNumber, getDailyStats } from '../database/db';
import { syncPendingOrders } from '../services/syncService';
import { COLORS, RADIUS } from '../utils/theme';

import BarcodeScanner from '../components/BarcodeScanner';
import CartItemRow from '../components/CartItem';
import PaymentModal from '../components/PaymentModal';
import ReceiptModal from '../components/ReceiptModal';
import { POSLogo } from '../components/Logo';

// ─── Header ────────────────────────────────────────────────
const POSHeader: React.FC<{
  dailyCount: number;
  dailyTotal: number;
  onSync: () => void;
  syncing: boolean;
}> = ({ dailyCount, dailyTotal, onSync, syncing }) => (
  <View style={styles.headerBar}>
    <POSLogo size={36} variant="icon" />
    <View style={styles.headerCenter}>
      <Text style={styles.headerDate}>{format(new Date(), 'EEE d MMM')}</Text>
      <Text style={styles.headerStats}>
        {dailyCount} บิล · ฿{dailyTotal.toLocaleString()}
      </Text>
    </View>
    <TouchableOpacity style={styles.syncBtn} onPress={onSync} disabled={syncing}>
      <Text style={styles.syncText}>{syncing ? '⏳' : '☁️'}</Text>
    </TouchableOpacity>
  </View>
);

// ─── Empty Cart ────────────────────────────────────────────
const EmptyCart: React.FC<{ onScan: () => void }> = ({ onScan }) => {
  const bounceAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.emptyCart}>
      <Animated.Text style={[styles.emptyEmoji, { transform: [{ scale: bounceAnim }] }]}>
        🛒
      </Animated.Text>
      <Text style={styles.emptyText}>ตะกร้าว่างเปล่า</Text>
      <Text style={styles.emptyHint}>กดสแกนสินค้า หรือแตะสินค้าด้านล่าง</Text>
      <TouchableOpacity style={styles.emptyScanBtn} onPress={onScan}>
        <Text style={styles.emptyScanText}>📷 เริ่มสแกน</Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── Quick Products ─────────────────────────────────────────
const QuickProducts: React.FC<{ onSelect: (p: Product) => void }> = ({ onSelect }) => {
  const top = SAMPLE_PRODUCTS.slice(0, 8);
  return (
    <View style={styles.quickSection}>
      <Text style={styles.quickTitle}>สินค้าด่วน</Text>
      <View style={styles.quickGrid}>
        {top.map((p) => (
          <TouchableOpacity key={p.id} style={styles.quickItem} onPress={() => onSelect(p)} activeOpacity={0.7}>
            <Text style={styles.quickEmoji}>{p.emoji}</Text>
            <Text style={styles.quickName} numberOfLines={2}>{p.name}</Text>
            <Text style={styles.quickPrice}>฿{p.price}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// ─── Main Screen ───────────────────────────────────────────
const POSScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [discountInput, setDiscountInput] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [dailyStats, setDailyStats] = useState({ count: 0, total: 0 });

  const totalAnim = useRef(new Animated.Value(1)).current;

  // Load daily stats
  const loadStats = useCallback(async () => {
    const stats = await getDailyStats();
    setDailyStats(stats);
  }, []);

  useEffect(() => {
    loadStats();
  }, []);

  // ── Cart Math ──────────────────────────────────────────
  const subtotal = cart.reduce((s, i) => s + i.subtotal, 0);
  const total = Math.max(0, subtotal - discount);
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

  // ── Animate total on change ─────────────────────────
  const animateTotal = () => {
    Animated.sequence([
      Animated.timing(totalAnim, { toValue: 1.12, duration: 100, useNativeDriver: true }),
      Animated.timing(totalAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  // ── Add to cart ─────────────────────────────────────
  const addToCart = useCallback((product: Product) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id);
      if (idx >= 0) {
        const updated = [...prev];
        const item = updated[idx];
        updated[idx] = {
          ...item,
          quantity: item.quantity + 1,
          subtotal: (item.quantity + 1) * item.product.price,
        };
        return updated;
      }
      return [...prev, { product, quantity: 1, subtotal: product.price }];
    });
    animateTotal();
  }, []);

  // ── Remove / decrease ──────────────────────────────
  const decreaseItem = useCallback((productId: string) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === productId);
      if (idx < 0) return prev;
      const item = prev[idx];
      if (item.quantity <= 1) return prev.filter((_, i) => i !== idx);
      const updated = [...prev];
      updated[idx] = {
        ...item,
        quantity: item.quantity - 1,
        subtotal: (item.quantity - 1) * item.product.price,
      };
      return updated;
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  // ── Barcode scan result ───────────────────────────
  const handleScanned = useCallback((barcode: string) => {
    setShowScanner(false);
    const product = findProductByBarcode(barcode);
    if (product) {
      addToCart(product);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Vibration.vibrate(300);
      Alert.alert(
        '❌ ไม่พบสินค้า',
        `บาร์โค้ด: ${barcode}\n\nยังไม่มีสินค้านี้ในระบบ`,
        [{ text: 'ตกลง' }]
      );
    }
  }, [addToCart]);

  // ── Confirm payment ────────────────────────────────
  const handlePaymentConfirm = useCallback(async (method: PaymentMethod, cashReceived?: number) => {
    setShowPayment(false);

    const billNumber = await generateBillNumber();
    const orderItems = cart.map((c) => ({
      productId: c.product.id,
      productName: c.product.name,
      barcode: c.product.barcode,
      price: c.product.price,
      quantity: c.quantity,
      subtotal: c.subtotal,
    }));

    const order: Order = {
      id: uuidv4(),
      billNumber,
      items: orderItems,
      subtotal,
      discount,
      total,
      paymentMethod: method,
      cashReceived: method === 'cash' ? cashReceived : undefined,
      change: method === 'cash' && cashReceived ? cashReceived - total : undefined,
      status: 'pending_sync',
      createdAt: new Date().toISOString(),
    };

    const saved = await saveOrder(order);
    if (saved) {
      setLastOrder(order);
      setCart([]);
      setDiscount(0);
      setDiscountInput('');
      setShowReceipt(true);
      loadStats();
    } else {
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกบิลได้ กรุณาลองใหม่');
    }
  }, [cart, subtotal, discount, total]);

  // ── Sync ───────────────────────────────────────────
  const handleSync = async () => {
    setSyncing(true);
    const result = await syncPendingOrders();
    setSyncing(false);
    Alert.alert(result.success ? '✅ Sync สำเร็จ' : '⚠️ Sync บางส่วน', result.message);
  };

  // ── Clear cart ─────────────────────────────────────
  const handleClear = () => {
    if (cart.length === 0) return;
    Alert.alert('ล้างตะกร้า?', 'ต้องการลบสินค้าทั้งหมดออกจากตะกร้า?', [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ล้าง', style: 'destructive', onPress: () => { setCart([]); setDiscount(0); setDiscountInput(''); } },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <POSHeader
        dailyCount={dailyStats.count}
        dailyTotal={dailyStats.total}
        onSync={handleSync}
        syncing={syncing}
      />

      {/* Top action bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.scanBtn} onPress={() => setShowScanner(true)} activeOpacity={0.85}>
          <Text style={styles.scanBtnText}>📷 สแกนสินค้า</Text>
        </TouchableOpacity>
        {cart.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
            <Text style={styles.clearBtnText}>🗑 ล้าง</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Cart list */}
      {cart.length > 0 ? (
        <FlatList
          data={cart}
          keyExtractor={(item) => item.product.id}
          renderItem={({ item }) => (
            <CartItemRow
              item={item}
              onIncrease={() => addToCart(item.product)}
              onDecrease={() => decreaseItem(item.product.id)}
              onRemove={() => removeItem(item.product.id)}
            />
          )}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 8 }}
          style={styles.cartList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <View style={styles.discountWrap}>
              <Text style={styles.discountLabel}>🏷️ ส่วนลด (฿)</Text>
              <TextInput
                style={styles.discountInput}
                value={discountInput}
                onChangeText={(t) => {
                  setDiscountInput(t);
                  const val = parseFloat(t) || 0;
                  setDiscount(Math.min(val, subtotal));
                }}
                placeholder="0"
                placeholderTextColor={COLORS.textDim}
                keyboardType="numeric"
              />
            </View>
          }
        />
      ) : (
        <View style={styles.emptyWrap}>
          <EmptyCart onScan={() => setShowScanner(true)} />
          <QuickProducts onSelect={addToCart} />
        </View>
      )}

      {/* Summary + Pay button */}
      <View style={[styles.summaryBar, { paddingBottom: insets.bottom + 8 }]}>
        {/* Summary row */}
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.summaryItems}>{itemCount} รายการ</Text>
            {discount > 0 && (
              <Text style={styles.summaryDiscount}>ส่วนลด -฿{discount.toFixed(2)}</Text>
            )}
          </View>
          <Animated.Text style={[styles.summaryTotal, { transform: [{ scale: totalAnim }] }]}>
            ฿{total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </Animated.Text>
        </View>

        {/* Pay button */}
        <TouchableOpacity
          style={[styles.payBtn, cart.length === 0 && styles.payBtnDisabled]}
          onPress={() => cart.length > 0 && setShowPayment(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.payBtnText}>
            {cart.length === 0 ? '🛒 เพิ่มสินค้าก่อน' : `💳 ชำระเงิน ฿${total.toLocaleString()}`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modals */}
      <BarcodeScanner
        visible={showScanner}
        onScanned={handleScanned}
        onClose={() => setShowScanner(false)}
      />
      <PaymentModal
        visible={showPayment}
        total={total}
        onConfirm={handlePaymentConfirm}
        onClose={() => setShowPayment(false)}
      />
      <ReceiptModal
        visible={showReceipt}
        order={lastOrder}
        onClose={() => setShowReceipt(false)}
        onNewSale={() => setShowReceipt(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  headerBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 10, gap: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerCenter: { flex: 1 },
  headerDate: { color: COLORS.textMuted, fontSize: 11 },
  headerStats: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  syncBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.surfaceHigh, alignItems: 'center', justifyContent: 'center',
  },
  syncText: { fontSize: 18 },
  actionBar: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 10,
  },
  scanBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    paddingVertical: 14, gap: 8,
  },
  scanBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  clearBtn: {
    paddingHorizontal: 16, paddingVertical: 14, borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  clearBtnText: { color: COLORS.danger, fontSize: 14, fontWeight: '600' },
  cartList: { flex: 1 },
  emptyWrap: { flex: 1 },
  emptyCart: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, minHeight: 200,
  },
  emptyEmoji: { fontSize: 64, marginBottom: 12 },
  emptyText: { color: COLORS.text, fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptyHint: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', marginBottom: 16 },
  emptyScanBtn: {
    backgroundColor: COLORS.primary + '22', borderWidth: 1, borderColor: COLORS.primary,
    paddingHorizontal: 24, paddingVertical: 10, borderRadius: RADIUS.full,
  },
  emptyScanText: { color: COLORS.primary, fontWeight: '700' },
  quickSection: { paddingHorizontal: 16, paddingBottom: 8 },
  quickTitle: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 8, letterSpacing: 1 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickItem: {
    width: '22%', backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: 10, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  quickEmoji: { fontSize: 22, marginBottom: 4 },
  quickName: { color: COLORS.text, fontSize: 10, textAlign: 'center', marginBottom: 2 },
  quickPrice: { color: COLORS.accent, fontSize: 11, fontWeight: '700' },
  discountWrap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginTop: 8, backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md, padding: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  discountLabel: { color: COLORS.textMuted, fontSize: 13 },
  discountInput: {
    color: COLORS.warning, fontSize: 16, fontWeight: '700',
    textAlign: 'right', minWidth: 80,
  },
  summaryBar: {
    backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingHorizontal: 16, paddingTop: 12, gap: 10,
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
  },
  summaryItems: { color: COLORS.textMuted, fontSize: 13 },
  summaryDiscount: { color: COLORS.warning, fontSize: 12 },
  summaryTotal: { color: COLORS.accent, fontSize: 28, fontWeight: '800' },
  payBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    paddingVertical: 16, alignItems: 'center',
  },
  payBtnDisabled: { backgroundColor: COLORS.surfacePop },
  payBtnText: { color: '#FFF', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
});

export default POSScreen;
