import React from 'react';
import Svg, {
  Circle,
  Path,
  Rect,
  Text,
  Defs,
  LinearGradient,
  Stop,
  G,
  Line,
  Polygon,
} from 'react-native-svg';

interface POSLogoProps {
  size?: number;
  variant?: 'full' | 'icon';
}

export const POSLogo: React.FC<POSLogoProps> = ({ size = 80, variant = 'icon' }) => {
  if (variant === 'icon') {
    return (
      <Svg width={size} height={size} viewBox="0 0 80 80">
        <Defs>
          <LinearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FF6B35" />
            <Stop offset="1" stopColor="#FF3F7A" />
          </LinearGradient>
          <LinearGradient id="screenGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#1A2744" />
            <Stop offset="1" stopColor="#0D1525" />
          </LinearGradient>
        </Defs>

        {/* Background circle */}
        <Circle cx="40" cy="40" r="38" fill="url(#bgGrad)" />

        {/* POS Terminal body */}
        <Rect x="20" y="18" width="40" height="30" rx="4" fill="url(#screenGrad)" />

        {/* Screen glow line */}
        <Rect x="24" y="22" width="32" height="18" rx="2" fill="#0FF4C6" opacity="0.12" />
        {/* Screen text lines */}
        <Rect x="26" y="25" width="18" height="2" rx="1" fill="#0FF4C6" opacity="0.8" />
        <Rect x="26" y="29" width="12" height="2" rx="1" fill="#0FF4C6" opacity="0.5" />
        <Rect x="26" y="33" width="22" height="2" rx="1" fill="#FFFFFF" opacity="0.6" />

        {/* Price display right */}
        <Rect x="48" y="25" width="6" height="10" rx="1" fill="#FFD700" opacity="0.9" />

        {/* Keypad */}
        <Rect x="22" y="51" width="36" height="12" rx="3" fill="#1E2D50" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Rect
            key={i}
            x={24 + (i % 4) * 9}
            y={53 + Math.floor(i / 4) * 5}
            width="7"
            height="3"
            rx="1"
            fill={i === 7 ? '#0FF4C6' : '#2A3F6B'}
          />
        ))}

        {/* Receipt strip */}
        <Rect x="34" y="46" width="12" height="6" rx="1" fill="#F5F0E8" opacity="0.9" />
        <Rect x="36" y="48" width="8" height="1" rx="0.5" fill="#999" opacity="0.6" />
        <Rect x="36" y="50" width="5" height="1" rx="0.5" fill="#999" opacity="0.6" />
      </Svg>
    );
  }

  // Full variant with text
  return (
    <Svg width={size * 3} height={size} viewBox="0 0 240 80">
      <Defs>
        <LinearGradient id="bgGrad2" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FF6B35" />
          <Stop offset="1" stopColor="#FF3F7A" />
        </LinearGradient>
      </Defs>

      {/* Icon part */}
      <Circle cx="40" cy="40" r="36" fill="url(#bgGrad2)" />
      <Rect x="22" y="20" width="36" height="26" rx="3" fill="#0D1525" />
      <Rect x="26" y="24" width="28" height="14" rx="2" fill="#0FF4C6" opacity="0.1" />
      <Rect x="28" y="27" width="14" height="2" rx="1" fill="#0FF4C6" opacity="0.9" />
      <Rect x="28" y="31" width="10" height="2" rx="1" fill="#0FF4C6" opacity="0.5" />
      <Rect x="28" y="35" width="20" height="2" rx="1" fill="#FFFFFF" opacity="0.6" />
      <Rect x="22" y="49" width="36" height="10" rx="3" fill="#1A2744" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Rect
          key={i}
          x={24 + (i % 3) * 12}
          y={51 + Math.floor(i / 3) * 4}
          width="10"
          height="3"
          rx="1"
          fill={i === 5 ? '#0FF4C6' : '#2A3F6B'}
        />
      ))}

      {/* Text */}
      <Text x="88" y="35" fontSize="26" fontWeight="800" fill="#FFFFFF" letterSpacing="1">
        POS
      </Text>
      <Text x="88" y="56" fontSize="14" fontWeight="400" fill="#FF6B35" letterSpacing="3">
        ร้านค้า
      </Text>
    </Svg>
  );
};

export default POSLogo;
