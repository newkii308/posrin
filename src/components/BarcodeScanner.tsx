import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Vibration,
  Animated,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { COLORS, RADIUS } from '../utils/theme';

interface BarcodeScannerProps {
  visible: boolean;
  onScanned: (barcode: string) => void;
  onClose: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  visible,
  onScanned,
  onClose,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [manualCode, setManualCode] = useState('');
  const [scanned, setScanned] = useState(false);
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setScanned(false);
      setManualCode('');
      startScanLine();
    }
  }, [visible]);

  const startScanLine = () => {
    scanLineAnim.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  };

  const flashSuccess = () => {
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const handleBarcodeScan = ({ data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);
    Vibration.vibrate(100);
    flashSuccess();
    setTimeout(() => {
      onScanned(data);
    }, 300);
  };

  const handleManualSubmit = () => {
    const code = manualCode.trim();
    if (!code) return;
    onScanned(code);
    setManualCode('');
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🔍 สแกนสินค้า</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Mode Toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'camera' && styles.modeBtnActive]}
            onPress={() => setMode('camera')}
          >
            <Text style={[styles.modeBtnText, mode === 'camera' && styles.modeBtnTextActive]}>
              📷 กล้อง
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'manual' && styles.modeBtnActive]}
            onPress={() => setMode('manual')}
          >
            <Text style={[styles.modeBtnText, mode === 'manual' && styles.modeBtnTextActive]}>
              ⌨️ พิมพ์เอง
            </Text>
          </TouchableOpacity>
        </View>

        {mode === 'camera' ? (
          <View style={styles.cameraWrap}>
            {!permission?.granted ? (
              <View style={styles.permissionBox}>
                <Text style={styles.permissionText}>ต้องการสิทธิ์เข้าถึงกล้อง</Text>
                <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
                  <Text style={styles.permBtnText}>อนุญาต</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.cameraContainer}>
                <CameraView
                  style={styles.camera}
                  facing="back"
                  barcodeScannerSettings={{
                    barcodeTypes: [
                      'ean13', 'ean8', 'upc_a', 'upc_e',
                      'code128', 'code39', 'qr', 'pdf417',
                    ],
                  }}
                  onBarcodeScanned={scanned ? undefined : handleBarcodeScan}
                />

                {/* Scan overlay */}
                <View style={styles.overlay}>
                  <View style={styles.scanFrame}>
                    {/* Corner marks */}
                    <View style={[styles.corner, styles.cornerTL]} />
                    <View style={[styles.corner, styles.cornerTR]} />
                    <View style={[styles.corner, styles.cornerBL]} />
                    <View style={[styles.corner, styles.cornerBR]} />

                    {/* Scan line */}
                    <Animated.View
                      style={[
                        styles.scanLine,
                        {
                          transform: [{
                            translateY: scanLineAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, 200],
                            }),
                          }],
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Flash on scan */}
                <Animated.View
                  style={[
                    styles.flashOverlay,
                    { opacity: flashAnim },
                  ]}
                />

                <Text style={styles.scanHint}>
                  {scanned ? '✅ สแกนแล้ว...' : 'วางบาร์โค้ดในกรอบ'}
                </Text>

                {scanned && (
                  <TouchableOpacity
                    style={styles.rescanBtn}
                    onPress={() => setScanned(false)}
                  >
                    <Text style={styles.rescanText}>สแกนใหม่</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.manualWrap}>
            <Text style={styles.manualLabel}>กรอกบาร์โค้ดหรือรหัสสินค้า</Text>
            <View style={styles.manualRow}>
              <TextInput
                style={styles.manualInput}
                value={manualCode}
                onChangeText={setManualCode}
                placeholder="เช่น 8850006210008"
                placeholderTextColor={COLORS.textDim}
                keyboardType="number-pad"
                returnKeyType="search"
                autoFocus
                onSubmitEditing={handleManualSubmit}
              />
              <TouchableOpacity style={styles.manualSubmit} onPress={handleManualSubmit}>
                <Text style={styles.manualSubmitText}>ค้นหา</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.manualHint}>
              💡 ลองพิมพ์: 8850006210008 (น้ำดื่ม)
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: COLORS.textMuted, fontSize: 16 },
  modeToggle: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  modeBtnActive: { backgroundColor: COLORS.primary },
  modeBtnText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
  modeBtnTextActive: { color: '#FFF' },
  cameraWrap: { flex: 1 },
  cameraContainer: { flex: 1, position: 'relative' },
  camera: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 240,
    height: 200,
    position: 'relative',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: COLORS.accent,
    borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  scanLine: {
    width: '100%',
    height: 2,
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
  },
  scanHint: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    color: COLORS.text,
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  rescanBtn: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  rescanText: { color: '#FFF', fontWeight: '700' },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  permissionText: { color: COLORS.text, fontSize: 16 },
  permBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permBtnText: { color: '#FFF', fontWeight: '700' },
  manualWrap: {
    padding: 20,
    gap: 12,
  },
  manualLabel: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginBottom: 4,
  },
  manualRow: {
    flexDirection: 'row',
    gap: 10,
  },
  manualInput: {
    flex: 1,
    height: 52,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  manualSubmit: {
    height: 52,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualSubmitText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  manualHint: {
    color: COLORS.textDim,
    fontSize: 12,
    marginTop: 8,
  },
});

export default BarcodeScanner;
