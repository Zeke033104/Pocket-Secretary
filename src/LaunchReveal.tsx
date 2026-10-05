import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { PocketMarkImage, PocketWordImage } from './LogoAssets';

const BACKGROUND = '#FFFFFF';
const MARK_SIZE = 86;

let revealStartedThisLaunch = false;

export function PocketMark({ size = MARK_SIZE }: { size?: number }) {
  return <PocketMarkImage size={size} />;
}

export function LaunchReveal({ onFinish }: { onFinish: () => void }) {
  const markY = useRef(new Animated.Value(31)).current;
  const markScale = useRef(new Animated.Value(.88)).current;
  const wordOpacity = useRef(new Animated.Value(0)).current;
  const wordY = useRef(new Animated.Value(-18)).current;
  const wordScale = useRef(new Animated.Value(.96)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let active = true;
    if (revealStartedThisLaunch) { onFinish(); return; }
    revealStartedThisLaunch = true;

    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (!active) return;
      if (reduceMotion) {
        markY.setValue(0); markScale.setValue(1); wordOpacity.setValue(1); wordY.setValue(0); wordScale.setValue(1);
        Animated.sequence([
          Animated.delay(420),
          Animated.timing(screenOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        ]).start(({ finished }) => finished && active && onFinish());
        return;
      }

      Animated.sequence([
        Animated.delay(180),
        Animated.parallel([
          Animated.timing(markY, { toValue: 0, duration: 470, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.spring(markScale, { toValue: 1, damping: 15, stiffness: 150, mass: .7, useNativeDriver: true }),
          Animated.sequence([
            Animated.delay(120),
            Animated.parallel([
              Animated.timing(wordOpacity, { toValue: 1, duration: 330, easing: Easing.out(Easing.quad), useNativeDriver: true }),
              Animated.timing(wordY, { toValue: 0, duration: 390, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
              Animated.timing(wordScale, { toValue: 1, duration: 390, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            ]),
          ]),
        ]),
        Animated.delay(280),
        Animated.timing(screenOpacity, { toValue: 0, duration: 220, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]).start(({ finished }) => finished && active && onFinish());
    });

    return () => { active = false; };
  }, [markScale, markY, onFinish, screenOpacity, wordOpacity, wordScale, wordY]);

  return <Animated.View accessibilityLabel="Pocket Secretary" style={[styles.screen, { opacity: screenOpacity }]}>
    <StatusBar style="dark" />
    <View style={styles.lockup}>
      <Animated.View style={[styles.markWrap, { transform: [{ translateY: markY }, { scale: markScale }] }]}>
        <PocketMark />
      </Animated.View>
      <Animated.View style={[styles.wordWrap, { opacity: wordOpacity, transform: [{ translateY: wordY }, { scale: wordScale }] }]}><PocketWordImage width={196} /></Animated.View>
    </View>
  </Animated.View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BACKGROUND, alignItems: 'center', justifyContent: 'center' },
  lockup: { width: 230, height: 170, alignItems: 'center', justifyContent: 'flex-start' },
  markWrap: { width: MARK_SIZE, height: 96, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  wordWrap: { width: 230, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
});
