import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Share,
  Alert,
} from 'react-native';
import * as Print from 'expo-print';
import { COLORS, RADIUS } from '../utils/theme';
import { Order } from '../types';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface ReceiptModalProps {
  visible: boolean;
  order: Order | null;
  onClose: () => void;
  onNewSale: () => void;
}

const STORE_NAME = 'ร้านของฉัน';
const STORE_TEL = '082-xxx-xxxx';
const STORE_ADDR = '123 ถ.สุขุมวิท กรุงเทพฯ';

function buildReceiptHTML(order: Order): string {
  const dateStr = format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm', { locale: th });
  const rows = order.items
    .map(
      (item) =>
        `<tr>
          <td>${item.productName}</td>
          <td style="text-align:center">${item.quantity}</td>
          <td style="text-align:right">฿${item.price.toFixed(2)}</td>
          <td style="text-align:right">฿${item.subtotal.toFixed(2)}</td>
        </tr>`
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html><head>
      <meta charset="UTF-8"/>
      <style>
        body{font-family:'Sarabun',sans-serif;margin:0;padding:16px;background:#fff;color:#000}
        .center{text-align:center}
        .title{font-size:22px;font-weight:800;margin:0}
        .sub{font-size:12px;color:#666;margin:2px 0}
        .divider{border:none;border-top:1px dashed #ccc;margin:10px 0}
        table{width:100%;border-collapse:collapse;font-size:13px}
        th{text-align:left;padding:4px 0;border-bottom:1px solid #eee;font-weight:700;font-size:12px}
        td{padding:5px 0;vertical-align:top}
        .total-row{font-weight:800;font-size:16px}
        .footer{text-align:center;margin-top:16px;font-size:12px;color:#888}
        .badge{display:inline-block;background:#0A0A0F;color:#0FF4C6;padding:3px 12px;border-radius:20px;font-size:11px;font-weight:700}
        .change-row td{color:#007A4D;font-weight:700}
      </style>
    </head><body>
      <div class="center">
        <p class="title">${STORE_NAME}</p>
        <p class="sub">${STORE_ADDR}</p>
        <p class="sub">โทร ${STORE_TEL}</p>
        <hr class="divider"/>
        <p class="sub">เลขที่: <strong>${order.billNumber}</strong> &nbsp; ${dateStr}</p>
        <p><span class="badge">${order.paymentMethod === 'cash' ? '💵 เงินสด' : '📱 QR พร้อมเพย์'}</span></p>
      </div>
      <hr class="divider"/>
      <table>
        <thead>
          <tr>
            <th>รายการ</th><th style="text-align:center">จำนวน</th>
            <th style="text-align:right">ราคา</th><th style="text-align:right">รวม</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <hr class="divider"/>
      <table>
        <tr><td>ยอดรวม</td><td style="text-align:right">฿${order.subtotal.toFixed(2)}</td></tr>
        ${order.discount > 0 ? `<tr><td>ส่วนลด</td><td style="text-align:right">-฿${order.discount.toFixed(2)}</td></tr>` : ''}
        <tr class="total-row"><td>ยอดชำระ</td><td style="text-align:right">฿${order.total.toFixed(2)}</td></tr>
        ${order.cashReceived != null ? `
          <tr><td style="color:#666">รับเงิน</td><td style="text-align:right;color:#666">฿${order.cashReceived.toFixed(2)}</td></tr>
          <tr class="change-row"><td>เงินทอน</td><td style="text-align:right">฿${(order.change ?? 0).toFixed(2)}</td></tr>
        ` : ''}
      </table>
      <hr class="divider"/>
      <div class="footer">
        <p>ขอบคุณที่ใช้บริการ 🙏</p>
        <p>กรุณาเก็บใบเสร็จไว้เป็นหลักฐาน</p>
      </div>
    </body></html>
  `;
}

function buildReceiptText(order: Order): string {
  const dateStr = format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm');
  const line = '─'.repeat(32);
  const rows = order.items
    .map((item) => `${item.productName}\n  ${item.quantity} x ฿${item.price} = ฿${item.subtotal}`)
    .join('\n');

  return [
    `🧾 ${STORE_NAME}`,
    STORE_ADDR,
    `โทร ${STORE_TEL}`,
    line,
    `บิล: ${order.billNumber}`,
    `วันที่: ${dateStr}`,
    line,
    rows,
    line,
    `รวม: ฿${order.total.toFixed(2)}`,
    order.cashReceived != null
      ? `รับ: ฿${order.cashReceived.toFixed(2)}  ทอน: ฿${(order.change ?? 0).toFixed(2)}`
      : '',
    line,
    'ขอบคุณที่ใช้บริการ 🙏',
  ]
    .filter(Boolean)
    .join('\n');
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ visible, order, onClose, onNewSale }) => {
  if (!order) return null;

  const handlePrint = async () => {
    try {
      const html = buildReceiptHTML(order);
      await Print.printAsync({ html });
    } catch (err) {
      Alert.alert('ไม่สามารถพิมพ์ได้', 'กรุณาลองใหม่อีกครั้ง');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: buildReceiptText(order) });
    } catch {}
  };

  const dateStr = format(new Date(order.createdAt), 'dd MMM yyyy HH:mm', { locale: th });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🧾 ใบเสร็จ</Text>
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Receipt Paper */}
          <View style={styles.receipt}>
            {/* Store header */}
            <Text style={styles.storeName}>{STORE_NAME}</Text>
            <Text style={styles.storeInfo}>{STORE_ADDR}</Text>
            <Text style={styles.storeInfo}>โทร {STORE_TEL}</Text>

            <View style={styles.dashed} />

            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>เลขที่บิล</Text>
              <Text style={styles.metaVal}>{order.billNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>วันที่/เวลา</Text>
              <Text style={styles.metaVal}>{dateStr}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>ชำระด้วย</Text>
              <View style={[styles.payBadge, order.paymentMethod === 'cash' ? styles.payBadgeCash : styles.payBadgeQR]}>
                <Text style={styles.payBadgeText}>
                  {order.paymentMethod === 'cash' ? '💵 เงินสด' : '📱 QR พร้อมเพย์'}
                </Text>
              </View>
            </View>

            <View style={styles.dashed} />

            {/* Items header */}
            <View style={styles.itemsHeader}>
              <Text style={[styles.itemCol, { flex: 2.5 }]}>รายการ</Text>
              <Text style={[styles.itemCol, { flex: 0.8, textAlign: 'center' }]}>จำนวน</Text>
              <Text style={[styles.itemCol, { flex: 1.2, textAlign: 'right' }]}>รวม</Text>
            </View>

            {order.items.map((item, idx) => (
              <View key={idx} style={styles.itemRow}>
                <View style={{ flex: 2.5 }}>
                  <Text style={styles.itemName}>{item.productName}</Text>
                  <Text style={styles.itemPrice}>฿{item.price} / หน่วย</Text>
                </View>
                <Text style={[styles.itemQty, { flex: 0.8 }]}>{item.quantity}</Text>
                <Text style={[styles.itemSubtotal, { flex: 1.2 }]}>฿{item.subtotal.toFixed(2)}</Text>
              </View>
            ))}

            <View style={styles.dashed} />

            {/* Totals */}
            <View style={styles.totalSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>ยอดรวมสินค้า</Text>
                <Text style={styles.totalValue}>฿{order.subtotal.toFixed(2)}</Text>
              </View>
              {order.discount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>ส่วนลด</Text>
                  <Text style={[styles.totalValue, { color: COLORS.danger }]}>-฿{order.discount.toFixed(2)}</Text>
                </View>
              )}
              <View style={[styles.totalRow, styles.totalMain]}>
                <Text style={styles.totalMainLabel}>ยอดชำระ</Text>
                <Text style={styles.totalMainValue}>฿{order.total.toFixed(2)}</Text>
              </View>
              {order.cashReceived != null && (
                <>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>รับเงินมา</Text>
                    <Text style={styles.totalValue}>฿{order.cashReceived.toFixed(2)}</Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={[styles.totalLabel, { color: COLORS.success }]}>เงินทอน</Text>
                    <Text style={[styles.totalValue, { color: COLORS.success, fontWeight: '700' }]}>
                      ฿{(order.change ?? 0).toFixed(2)}
                    </Text>
                  </View>
                </>
              )}
            </View>

            <View style={styles.dashed} />
            <Text style={styles.thankYou}>ขอบคุณที่ใช้บริการ 🙏</Text>
            <Text style={styles.keepNote}>กรุณาเก็บใบเสร็จไว้เป็นหลักฐาน</Text>
          </View>
        </ScrollView>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
            <Text style={styles.actionText}>📤 แชร์</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handlePrint}>
            <Text style={styles.actionText}>🖨️ พิมพ์</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={onNewSale}>
            <Text style={[styles.actionText, { color: '#FFF' }]}>🛒 ขายต่อ</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { padding: 20, paddingBottom: 8 },
  title: { color: COLORS.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  scroll: { flex: 1 },
  receipt: {
    margin: 16, backgroundColor: '#FAFAF5',
    borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  storeName: { color: '#0A0A0F', fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  storeInfo: { color: '#666', fontSize: 12, textAlign: 'center' },
  dashed: { borderStyle: 'dashed', borderColor: '#ccc', borderWidth: 0, borderTopWidth: 1, marginVertical: 12 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  metaKey: { color: '#888', fontSize: 12 },
  metaVal: { color: '#0A0A0F', fontSize: 12, fontWeight: '600' },
  payBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  payBadgeCash: { backgroundColor: COLORS.cash + '33' },
  payBadgeQR: { backgroundColor: COLORS.qr + '33' },
  payBadgeText: { fontSize: 11, fontWeight: '700', color: '#0A0A0F' },
  itemsHeader: { flexDirection: 'row', marginBottom: 6 },
  itemCol: { color: '#888', fontSize: 11, fontWeight: '700' },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  itemName: { color: '#0A0A0F', fontSize: 13, fontWeight: '600' },
  itemPrice: { color: '#888', fontSize: 11 },
  itemQty: { color: '#0A0A0F', fontSize: 13, textAlign: 'center', paddingTop: 1 },
  itemSubtotal: { color: '#0A0A0F', fontSize: 13, fontWeight: '700', textAlign: 'right', paddingTop: 1 },
  totalSection: { gap: 6 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { color: '#666', fontSize: 13 },
  totalValue: { color: '#0A0A0F', fontSize: 13 },
  totalMain: { marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderColor: '#eee' },
  totalMainLabel: { color: '#0A0A0F', fontSize: 16, fontWeight: '800' },
  totalMainValue: { color: '#0A0A0F', fontSize: 20, fontWeight: '800' },
  thankYou: { color: '#0A0A0F', fontSize: 14, textAlign: 'center', fontWeight: '700', marginTop: 4 },
  keepNote: { color: '#888', fontSize: 11, textAlign: 'center', marginTop: 4 },
  actions: { flexDirection: 'row', padding: 16, gap: 10, paddingBottom: 32 },
  actionBtn: {
    flex: 1, paddingVertical: 14, borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  actionBtnPrimary: { backgroundColor: COLORS.primary, borderColor: COLORS.primary, flex: 1.5 },
  actionText: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
});

export default ReceiptModal;
