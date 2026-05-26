import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { getRecentOrders, getDailyStats } from '../database/db';
import { Order } from '../types';
import { COLORS, RADIUS } from '../utils/theme';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  completed: { label: 'เสร็จสิ้น', color: COLORS.success },
  pending_sync: { label: 'รอ sync', color: COLORS.warning },
  synced: { label: 'sync แล้ว', color: COLORS.info },
  voided: { label: 'ยกเลิก', color: COLORS.danger },
};

const OrderCard: React.FC<{ order: Order; onPress: () => void }> = ({ order, onPress }) => {
  const st = STATUS_MAP[order.status] ?? { label: order.status, color: COLORS.textMuted };
  const dateStr = format(new Date(order.createdAt), 'HH:mm', { locale: th });
  const dayStr = format(new Date(order.createdAt), 'dd/MM/yy');

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardLeft}>
        <Text style={styles.billNo}>{order.billNumber}</Text>
        <Text style={styles.billDate}>{dayStr} · {dateStr}</Text>
        <Text style={styles.billItems}>{order.items.length} รายการ · {order.paymentMethod === 'cash' ? '💵 เงินสด' : '📱 QR'}</Text>
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.billTotal}>฿{order.total.toLocaleString()}</Text>
        <View style={[styles.statusBadge, { backgroundColor: st.color + '22' }]}>
          <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const OrderDetailModal: React.FC<{ order: Order | null; onClose: () => void }> = ({ order, onClose }) => {
  if (!order) return null;
  const dateStr = format(new Date(order.createdAt), 'dd MMM yyyy HH:mm', { locale: th });

  return (
    <Modal visible={!!order} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.detailContainer}>
        <View style={styles.detailHeader}>
          <Text style={styles.detailTitle}>{order.billNumber}</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          <Text style={styles.detailDate}>{dateStr}</Text>
          <Text style={styles.detailPay}>
            {order.paymentMethod === 'cash' ? '💵 เงินสด' : '📱 QR พร้อมเพย์'}
          </Text>
          <View style={styles.detailDivider} />
          {order.items.map((item, i) => (
            <View key={i} style={styles.detailItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailItemName}>{item.productName}</Text>
                <Text style={styles.detailItemPrice}>฿{item.price} × {item.quantity}</Text>
              </View>
              <Text style={styles.detailItemSub}>฿{item.subtotal.toFixed(2)}</Text>
            </View>
          ))}
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>ยอดรวม</Text>
            <Text style={styles.detailValue}>฿{order.subtotal.toFixed(2)}</Text>
          </View>
          {order.discount > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>ส่วนลด</Text>
              <Text style={[styles.detailValue, { color: COLORS.danger }]}>-฿{order.discount.toFixed(2)}</Text>
            </View>
          )}
          <View style={[styles.detailRow, styles.detailRowMain]}>
            <Text style={styles.detailLabelMain}>ยอดชำระ</Text>
            <Text style={styles.detailValueMain}>฿{order.total.toFixed(2)}</Text>
          </View>
          {order.cashReceived != null && (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>รับเงิน</Text>
                <Text style={styles.detailValue}>฿{order.cashReceived.toFixed(2)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: COLORS.success }]}>เงินทอน</Text>
                <Text style={[styles.detailValue, { color: COLORS.success }]}>฿{(order.change ?? 0).toFixed(2)}</Text>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const HistoryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({ count: 0, total: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Order | null>(null);

  const load = useCallback(async () => {
    const [o, s] = await Promise.all([getRecentOrders(50), getDailyStats()]);
    setOrders(o);
    setStats(s);
  }, []);

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Stats banner */}
      <View style={styles.statsBanner}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.count}</Text>
          <Text style={styles.statLabel}>บิลวันนี้</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: COLORS.accent }]}>฿{stats.total.toLocaleString()}</Text>
          <Text style={styles.statLabel}>ยอดขายวันนี้</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{orders.filter(o => o.status === 'pending_sync').length}</Text>
          <Text style={styles.statLabel}>รอ sync</Text>
        </View>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        renderItem={({ item }) => (
          <OrderCard order={item} onPress={() => setSelected(item)} />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 12 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyText}>ยังไม่มีรายการขาย</Text>
          </View>
        }
      />

      <OrderDetailModal order={selected} onClose={() => setSelected(null)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  statsBanner: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    margin: 12, borderRadius: RADIUS.lg, padding: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  statLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: COLORS.border, marginHorizontal: 8 },
  card: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardLeft: { flex: 1 },
  cardRight: { alignItems: 'flex-end', justifyContent: 'space-between' },
  billNo: { color: COLORS.text, fontSize: 14, fontWeight: '700', marginBottom: 3 },
  billDate: { color: COLORS.textMuted, fontSize: 12, marginBottom: 3 },
  billItems: { color: COLORS.textDim, fontSize: 11 },
  billTotal: { color: COLORS.accent, fontSize: 18, fontWeight: '800', marginBottom: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  statusText: { fontSize: 10, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: COLORS.textMuted, fontSize: 16 },
  detailContainer: { flex: 1, backgroundColor: COLORS.bg },
  detailHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  detailTitle: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: COLORS.surfaceHigh, alignItems: 'center', justifyContent: 'center',
  },
  closeTxt: { color: COLORS.textMuted },
  detailDate: { color: COLORS.textMuted, fontSize: 13, marginBottom: 4 },
  detailPay: { color: COLORS.text, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  detailDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  detailItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  detailItemName: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  detailItemPrice: { color: COLORS.textMuted, fontSize: 12 },
  detailItemSub: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  detailRowMain: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8, marginTop: 4 },
  detailLabel: { color: COLORS.textMuted, fontSize: 14 },
  detailValue: { color: COLORS.text, fontSize: 14 },
  detailLabelMain: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  detailValueMain: { color: COLORS.accent, fontSize: 20, fontWeight: '800' },
});

export default HistoryScreen;
