import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { CartItem as CartItemType } from '../types';
import { COLORS, FONTS } from '../utils/theme';

interface CartItemProps {
  item: CartItemType;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
}

const CartItemRow: React.FC<CartItemProps> = ({
  item,
  onIncrease,
  onDecrease,
  onRemove,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const pulse = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.04, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
  };

  const handleIncrease = () => {
    pulse();
    onIncrease();
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      {/* Emoji + Info */}
      <View style={styles.emojiWrap}>
        <Text style={styles.emoji}>{item.product.emoji}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {item.product.name}
        </Text>
        <Text style={styles.price}>
          ฿{item.product.price.toLocaleString()} / {item.product.unit}
        </Text>
      </View>

      {/* Qty Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.btn, styles.btnMinus]}
          onPress={item.quantity === 1 ? onRemove : onDecrease}
          activeOpacity={0.7}
        >
          <Text style={styles.btnText}>{item.quantity === 1 ? '🗑' : '−'}</Text>
        </TouchableOpacity>

        <Text style={styles.qty}>{item.quantity}</Text>

        <TouchableOpacity
          style={[styles.btn, styles.btnPlus]}
          onPress={handleIncrease}
          activeOpacity={0.7}
        >
          <Text style={styles.btnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Subtotal */}
      <Text style={styles.subtotal}>
        ฿{item.subtotal.toLocaleString()}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    marginHorizontal: 16,
    marginVertical: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emojiWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  emoji: { fontSize: 20 },
  info: { flex: 1, marginRight: 8 },
  name: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  price: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    gap: 6,
  },
  btn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnMinus: { backgroundColor: '#2A1A2E' },
  btnPlus: { backgroundColor: COLORS.primary + '33' },
  btnText: { fontSize: 14, color: COLORS.text },
  qty: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'center',
  },
  subtotal: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '700',
    minWidth: 60,
    textAlign: 'right',
  },
});

export default CartItemRow;
