import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  Vibration,
} from 'react-native';
import Svg, { Path, Rect, Circle, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import { COLORS, RADIUS } from '../utils/theme';
import { PaymentMethod } from '../types';

interface PaymentModalProps {
  visible: boolean;
  total: number;
  onConfirm: (method: PaymentMethod, cashReceived?: number) => void;
  onClose: () => void;
}

// QR Placeholder SVG
const QRCodeSVG: React.FC<{ size: number }> = ({ size }) => (
  <Svg width={size} height={size} viewBox="0 0 200 200">
    <Rect width="200" height="200" fill="#FFFFFF" rx="12" />
    {/* TL block */}
    <Rect x="16" y="16" width="56" height="56" rx="6" fill="#0A0A0F" />
    <Rect x="24" y="24" width="40" height="40" rx="4" fill="#FFFFFF" />
    <Rect x="32" y="32" width="24" height="24" rx="2" fill="#0A0A0F" />
    {/* TR block */}
    <Rect x="128" y="16" width="56" height="56" rx="6" fill="#0A0A0F" />
    <Rect x="136" y="24" width="40" height="40" rx="4" fill="#FFFFFF" />
    <Rect x="144" y="32" width="24" height="24" rx="2" fill="#0A0A0F" />
    {/* BL block */}
    <Rect x="16" y="128" width="56" height="56" rx="6" fill="#0A0A0F" />
    <Rect x="24" y="136" width="40" height="40" rx="4" fill="#FFFFFF" />
    <Rect x="32" y="144" width="24" height="24" rx="2" fill="#0A0A0F" />
    {/* Data dots */}
    {[
      [88,16],[96,16],[104,16],[88,24],[104,24],[96,32],[88,40],[96,40],[104,40],
      [88,48],[96,56],[104,56],[88,64],[96,64],
      [16,88],[24,88],[40,88],[48,88],[56,96],[16,104],[32,104],[48,104],[56,104],
      [16,112],[24,120],[40,112],[56,112],[16,120],[48,120],[56,120],
      [88,88],[96,88],[104,88],[112,88],[120,88],[128,88],
      [88,96],[96,96],[112,96],[120,96],[128,96],
      [88,104],[104,104],[112,104],[128,104],
      [88,112],[96,112],[120,112],[128,112],
      [88,120],[104,120],[112,120],[128,120],
      [88,128],[96,128],[104,128],[112,128],[128,128],
      [88,136],[96,136],[112,136],[128,136],
      [96,144],[104,144],[120,144],
      [88,152],[96,152],[112,152],[120,152],[128,152],
      [104,160],[112,160],[128,160],
      [88,168],[96,168],[104,168],[120,168],[128,168],
    ].map(([x, y], i) => (
      <Rect key={i} x={x} y={y} width="8" height="8" rx="1" fill="#0A0A0F" />
    ))}
    {/* PromptPay logo area */}
    <Rect x="80" y="80" width="40" height="40" rx="6" fill="#0052B4" />
    <Rect x="86" y="86" width="28" height="28" rx="4" fill="#FFFFFF" />
    <Circle cx="100" cy="100" r="8" fill="#0052B4" />
  </Svg>
);

// Numpad
const NUMPAD = [['1','2','3'],['4','5','6'],['7','8','9'],['.',  '0','⌫']];

const PaymentModal: React.FC<PaymentModalProps> = ({ visible, total, onConfirm, onClose }) => {
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [cashInput, setCashInput] = useState('');
  const slideAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const [confirming, setConfirming] = useState(false);

  const received = parseFloat(cashInput) || 0;
  const change = received - total;
  const canConfirm = method === 'qr' || received >= total;

  useEffect(() => {
    if (visible) {
      setCashInput('');
      setConfirming(false);
      successAnim.setValue(0);
      Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }).start();
    } else {
      slideAnim.setValue(0);
    }
  }, [visible]);

  const handleNumpad = (key: string) => {
    if (key === '⌫') {
      setCashInput(prev => prev.slice(0, -1));
    } else if (key === '.') {
      if (!cashInput.includes('.')) setCashInput(prev => prev + '.');
    } else {
      if (cashInput.length >= 8) return;
      setCashInput(prev => prev + key);
    }
  };

  const handleConfirm = () => {
    if (!canConfirm) return;
    setConfirming(true);
    Vibration.vibrate([0, 80, 50, 80]);
    Animated.timing(successAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    setTimeout(() => {
      onConfirm(method, method === 'cash' ? received : undefined);
    }, 600);
  };

  // Quick cash buttons
  const quickAmounts = [20, 50, 100, total, Math.ceil(total / 50) * 50].filter((v, i, a) => a.indexOf(v) === i && v >= total).slice(0, 4);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>ชำระเงิน</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Total */}
        <View style={styles.totalBanner}>
          <Text style={styles.totalLabel}>ยอดที่ต้องชำระ</Text>
          <Text style={styles.totalAmount}>฿{total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</Text>
        </View>

        {/* Method selector */}
        <View style={styles.methodRow}>
          <TouchableOpacity
            style={[styles.methodBtn, method === 'cash' && styles.methodBtnActive]}
            onPress={() => setMethod('cash')}
          >
            <Text style={styles.methodEmoji}>💵</Text>
            <Text style={[styles.methodText, method === 'cash' && styles.methodTextActive]}>เงินสด</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.methodBtn, method === 'qr' && styles.methodBtnActiveQR]}
            onPress={() => setMethod('qr')}
          >
            <Text style={styles.methodEmoji}>📱</Text>
            <Text style={[styles.methodText, method === 'qr' && styles.methodTextActiveQR]}>QR พร้อมเพย์</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {method === 'cash' ? (
            <View style={styles.cashWrap}>
              {/* Display */}
              <View style={styles.cashDisplay}>
                <Text style={styles.cashLabel}>รับเงินมา</Text>
                <Text style={styles.cashValue}>
                  ฿{cashInput ? parseFloat(cashInput || '0').toLocaleString() : '0'}
                </Text>
              </View>

              {/* Quick amounts */}
              <View style={styles.quickRow}>
                {quickAmounts.map(amt => (
                  <TouchableOpacity
                    key={amt}
                    style={styles.quickBtn}
                    onPress={() => setCashInput(amt.toString())}
                  >
                    <Text style={styles.quickText}>฿{amt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Change display */}
              {received > 0 && (
                <View style={[styles.changeBox, change >= 0 ? styles.changeOk : styles.changeErr]}>
                  <Text style={styles.changeLabel}>{change >= 0 ? '💰 เงินทอน' : '⚠️ ขาดอีก'}</Text>
                  <Text style={styles.changeAmount}>
                    ฿{Math.abs(change).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              )}

              {/* Numpad */}
              <View style={styles.numpad}>
                {NUMPAD.map((row, ri) => (
                  <View key={ri} style={styles.numpadRow}>
                    {row.map(key => (
                      <TouchableOpacity
                        key={key}
                        style={[styles.numKey, key === '⌫' && styles.numKeyDel]}
                        onPress={() => handleNumpad(key)}
                        activeOpacity={0.6}
                      >
                        <Text style={[styles.numKeyText, key === '⌫' && styles.numKeyDelText]}>{key}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.qrWrap}>
              <Text style={styles.qrInstructions}>เปิดแอพธนาคารแล้วสแกน QR ด้านล่าง</Text>
              <View style={styles.qrBox}>
                <QRCodeSVG size={200} />
                <View style={styles.qrAmountBadge}>
                  <Text style={styles.qrAmountText}>฿{total.toLocaleString()}</Text>
                </View>
              </View>
              <Text style={styles.qrNote}>💡 กด "ยืนยันชำระ" หลังลูกค้าโอนเสร็จแล้ว</Text>
              <View style={styles.qrBanks}>
                {['🏦 SCB','🏦 KBank','🏦 BBL','🏦 Krungthai'].map(b => (
                  <View key={b} style={styles.bankTag}><Text style={styles.bankTagText}>{b}</Text></View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Confirm Button */}
        <Animated.View style={[styles.confirmWrap, {
          transform: [{ scale: successAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.04, 1] }) }]
        }]}>
          <TouchableOpacity
            style={[styles.confirmBtn, !canConfirm && styles.confirmBtnDisabled, confirming && styles.confirmBtnSuccess]}
            onPress={handleConfirm}
            disabled={!canConfirm || confirming}
            activeOpacity={0.85}
          >
            <Text style={styles.confirmText}>
              {confirming ? '✅ กำลังบันทึก...' : canConfirm ? '✔ ยืนยันชำระเงิน' : '⚠️ จำนวนเงินไม่พอ'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8,
  },
  title: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.surfaceHigh, alignItems: 'center', justifyContent: 'center',
  },
  closeText: { color: COLORS.textMuted, fontSize: 16 },
  totalBanner: {
    marginHorizontal: 20, marginVertical: 8, borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.accent + '44',
  },
  totalLabel: { color: COLORS.textMuted, fontSize: 12, marginBottom: 4 },
  totalAmount: { color: COLORS.accent, fontSize: 36, fontWeight: '800', letterSpacing: 1 },
  methodRow: { flexDirection: 'row', marginHorizontal: 20, gap: 10, marginBottom: 12 },
  methodBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  methodBtnActive: { backgroundColor: COLORS.cash + '22', borderColor: COLORS.cash },
  methodBtnActiveQR: { backgroundColor: COLORS.qr + '22', borderColor: COLORS.qr },
  methodEmoji: { fontSize: 18 },
  methodText: { color: COLORS.textMuted, fontWeight: '600', fontSize: 14 },
  methodTextActive: { color: COLORS.cash },
  methodTextActiveQR: { color: COLORS.qr },
  cashWrap: { paddingHorizontal: 20 },
  cashDisplay: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16,
    marginBottom: 10, alignItems: 'flex-end',
    borderWidth: 1, borderColor: COLORS.border,
  },
  cashLabel: { color: COLORS.textMuted, fontSize: 12, marginBottom: 4 },
  cashValue: { color: COLORS.text, fontSize: 32, fontWeight: '700' },
  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  quickBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceHigh, borderWidth: 1, borderColor: COLORS.border,
  },
  quickText: { color: COLORS.primary, fontWeight: '600', fontSize: 13 },
  changeBox: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderRadius: RADIUS.md, padding: 12, marginBottom: 12,
  },
  changeOk: { backgroundColor: COLORS.success + '22' },
  changeErr: { backgroundColor: COLORS.danger + '22' },
  changeLabel: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  changeAmount: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  numpad: { gap: 8 },
  numpadRow: { flexDirection: 'row', gap: 8 },
  numKey: {
    flex: 1, height: 60, borderRadius: RADIUS.md, backgroundColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  numKeyDel: { backgroundColor: COLORS.surfacePop },
  numKeyText: { color: COLORS.text, fontSize: 22, fontWeight: '600' },
  numKeyDelText: { color: COLORS.danger },
  qrWrap: { alignItems: 'center', padding: 20, gap: 16 },
  qrInstructions: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },
  qrBox: { alignItems: 'center', position: 'relative' },
  qrAmountBadge: {
    position: 'absolute', bottom: -12,
    backgroundColor: COLORS.qr, paddingHorizontal: 20, paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  qrAmountText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  qrNote: { color: COLORS.textDim, fontSize: 12, textAlign: 'center', marginTop: 8 },
  qrBanks: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  bankTag: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceHigh,
  },
  bankTagText: { color: COLORS.textMuted, fontSize: 11 },
  confirmWrap: { padding: 16, paddingBottom: 32 },
  confirmBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    paddingVertical: 18, alignItems: 'center',
  },
  confirmBtnDisabled: { backgroundColor: COLORS.surfaceHigh },
  confirmBtnSuccess: { backgroundColor: COLORS.success },
  confirmText: { color: '#FFF', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
});

export default PaymentModal;
