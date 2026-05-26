import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initDB } from './src/database/db';
import { startAutoSync } from './src/services/syncService';
import { COLORS } from './src/utils/theme';
import POSScreen from './src/screens/POSScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import { POSLogo } from './src/components/Logo';

// ─── Tab Bar ───────────────────────────────────────────────
type Tab = 'pos' | 'history';

const TabBar: React.FC<{ active: Tab; onChange: (t: Tab) => void }> = ({ active, onChange }) => {
  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'pos', label: 'ขายของ', icon: '🛒' },
    { key: 'history', label: 'ประวัติ', icon: '📋' },
  ];

  return (
    <View style={tbStyles.bar}>
      {tabs.map(({ key, label, icon }) => {
        const isActive = active === key;
        return (
          <TouchableOpacity
            key={key}
            style={[tbStyles.tab, isActive && tbStyles.tabActive]}
            onPress={() => onChange(key)}
            activeOpacity={0.75}
          >
            <Text style={tbStyles.icon}>{icon}</Text>
            <Text style={[tbStyles.label, isActive && tbStyles.labelActive]}>{label}</Text>
            {isActive && <View style={tbStyles.indicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const tbStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: 0,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    position: 'relative',
  },
  tabActive: {},
  icon: { fontSize: 22, marginBottom: 2 },
  label: { color: COLORS.textDim, fontSize: 11, fontWeight: '600' },
  labelActive: { color: COLORS.primary },
  indicator: {
    position: 'absolute',
    top: 0,
    left: '20%',
    right: '20%',
    height: 2,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
});

// ─── Splash / Loading ──────────────────────────────────────
const Splash: React.FC = () => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
    ]).start();
  }, []);

  return (
    <View style={splashStyles.container}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
        <POSLogo size={80} variant="icon" />
        <Text style={splashStyles.title}>POS ร้านค้า</Text>
        <Text style={splashStyles.sub}>กำลังเริ่มระบบ...</Text>
        <View style={splashStyles.dots}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[splashStyles.dot, { opacity: 0.3 + i * 0.3 }]} />
          ))}
        </View>
      </Animated.View>
    </View>
  );
};

const splashStyles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: COLORS.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    color: COLORS.text, fontSize: 28, fontWeight: '800',
    marginTop: 16, letterSpacing: 1,
  },
  sub: { color: COLORS.textMuted, fontSize: 14, marginTop: 8 },
  dots: { flexDirection: 'row', gap: 8, marginTop: 24 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
});

// ─── Root App ──────────────────────────────────────────────
export default function App() {
  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('pos');

  useEffect(() => {
    async function boot() {
      try {
        await initDB();
        startAutoSync(60_000);
      } catch (err) {
        console.error('Boot error:', err);
      } finally {
        setReady(true);
      }
    }
    boot();
  }, []);

  if (!ready) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
          <Splash />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
        <View style={appStyles.root}>
          {/* Screen content */}
          <View style={appStyles.content}>
            {activeTab === 'pos' ? <POSScreen /> : <HistoryScreen />}
          </View>

          {/* Tab bar */}
          <TabBar active={activeTab} onChange={setActiveTab} />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const appStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  content: { flex: 1 },
});
