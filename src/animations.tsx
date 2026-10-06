import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleProp, ViewStyle } from 'react-native';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduced); const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced); return () => subscription.remove(); }, []);
  return reduced;
}

export function FadeInView({ children, delay = 0, distance = 8, style }: { children: React.ReactNode; delay?: number; distance?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion(); const opacity = useRef(new Animated.Value(reduced ? 1 : 0)).current; const y = useRef(new Animated.Value(reduced ? 0 : distance)).current;
  useEffect(() => { if (reduced) { opacity.setValue(1); y.setValue(0); return; } const animation = Animated.parallel([Animated.timing(opacity, { toValue: 1, duration: 240, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }), Animated.timing(y, { toValue: 0, duration: 260, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true })]); animation.start(); return () => animation.stop(); }, [delay, distance, opacity, reduced, y]);
  return <Animated.View style={[style, { opacity, transform: [{ translateY: y }] }]}>{children}</Animated.View>;
}
