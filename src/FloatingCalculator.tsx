import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from './theme';

const POSITION_KEY = 'pocket-secretary-calculator-position-v1';
const LAUNCHER_SIZE = 48;
const PANEL_WIDTH = 292;
const PANEL_HEIGHT = 402;
const EDGE_GAP = 12;
const BOTTOM_NAV_CLEARANCE = 92;
type Point = { x: number; y: number };
type Operator = '+' | '−' | '×' | '÷';

function calculate(left: number, right: number, operator: Operator) {
  if (operator === '÷' && right === 0) return null;
  const value = operator === '+' ? left + right : operator === '−' ? left - right : operator === '×' ? left * right : left / right;
  return Number.isFinite(value) ? Math.round(value * 1e10) / 1e10 : null;
}

function format(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(10)));
}

function validPoint(value: unknown): value is Point {
  if (!value || typeof value !== 'object') return false;
  const point = value as Point;
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

export function FloatingCalculator() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState('0');
  const [stored, setStored] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [waiting, setWaiting] = useState(false);
  const defaultPosition = { x: Math.max(EDGE_GAP, width - LAUNCHER_SIZE - EDGE_GAP), y: Math.max(insets.top + 8, height - insets.bottom - 135) };
  const launcherPosition = useRef(new Animated.ValueXY(defaultPosition)).current;
  const launcherCurrent = useRef<Point>(defaultPosition);
  const panelPosition = useRef(new Animated.ValueXY(defaultPosition)).current;
  const panelCurrent = useRef<Point>(defaultPosition);
  const launcherDragStart = useRef<Point>(defaultPosition);
  const panelDragStart = useRef<Point>(defaultPosition);
  const panelWidth = Math.min(PANEL_WIDTH, width - EDGE_GAP * 2);
  const panelHeight = Math.min(PANEL_HEIGHT, height - insets.top - insets.bottom - 16);

  const clampLauncher = (point: Point): Point => ({
    x: Math.max(EDGE_GAP, Math.min(point.x, width - LAUNCHER_SIZE - EDGE_GAP)),
    y: Math.max(insets.top + 8, Math.min(point.y, height - insets.bottom - LAUNCHER_SIZE - BOTTOM_NAV_CLEARANCE)),
  });
  const clampPanel = (point: Point): Point => ({
    x: Math.max(EDGE_GAP, Math.min(point.x, width - panelWidth - EDGE_GAP)),
    y: Math.max(insets.top + 8, Math.min(point.y, height - insets.bottom - panelHeight - 8)),
  });

  useEffect(() => {
    AsyncStorage.getItem(POSITION_KEY).then((saved) => {
      if (!saved) return;
      try {
        const parsed: unknown = JSON.parse(saved);
        if (!validPoint(parsed)) throw new Error('Invalid saved calculator position');
        const next = clampLauncher(parsed);
        launcherCurrent.current = next;
        launcherPosition.setValue(next);
        AsyncStorage.setItem(POSITION_KEY, JSON.stringify(next));
      } catch {
        AsyncStorage.removeItem(POSITION_KEY);
      }
    });
  }, []);

  useLayoutEffect(() => {
    const launcherNext = clampLauncher(launcherCurrent.current);
    launcherCurrent.current = launcherNext;
    launcherPosition.setValue(launcherNext);
    if (open) {
      const panelNext = clampPanel(panelCurrent.current);
      panelCurrent.current = panelNext;
      panelPosition.setValue(panelNext);
    }
  }, [open, width, height, insets.top, insets.bottom]);

  function openCalculator() {
    const next = clampPanel(launcherCurrent.current);
    panelCurrent.current = next;
    panelPosition.setValue(next);
    setOpen(true);
  }

  function closeCalculator() {
    setOpen(false);
    launcherPosition.setValue(launcherCurrent.current);
  }

  const launcherResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) + Math.abs(gesture.dy) > 4,
    onPanResponderGrant: () => {
      launcherPosition.stopAnimation((value) => {
        launcherCurrent.current = value;
        launcherDragStart.current = value;
      });
    },
    onPanResponderMove: (_, gesture) => launcherPosition.setValue(clampLauncher({ x: launcherDragStart.current.x + gesture.dx, y: launcherDragStart.current.y + gesture.dy })),
    onPanResponderRelease: (_, gesture) => {
      const next = clampLauncher({ x: launcherDragStart.current.x + gesture.dx, y: launcherDragStart.current.y + gesture.dy });
      launcherCurrent.current = next;
      launcherPosition.setValue(next);
      AsyncStorage.setItem(POSITION_KEY, JSON.stringify(next));
    },
    onPanResponderTerminate: () => launcherPosition.setValue(launcherCurrent.current),
  }), [width, height, insets.top, insets.bottom]);

  const panelResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) + Math.abs(gesture.dy) > 4,
    onPanResponderGrant: () => panelPosition.stopAnimation((value) => {
      panelCurrent.current = value;
      panelDragStart.current = value;
    }),
    onPanResponderMove: (_, gesture) => panelPosition.setValue(clampPanel({ x: panelDragStart.current.x + gesture.dx, y: panelDragStart.current.y + gesture.dy })),
    onPanResponderRelease: (_, gesture) => {
      const next = clampPanel({ x: panelDragStart.current.x + gesture.dx, y: panelDragStart.current.y + gesture.dy });
      panelCurrent.current = next;
      panelPosition.setValue(next);
    },
    onPanResponderTerminate: () => panelPosition.setValue(panelCurrent.current),
  }), [width, height, insets.top, insets.bottom, panelWidth, panelHeight]);

  function digit(value: string) {
    if (display === 'Error' || waiting) { setDisplay(value); setWaiting(false); }
    else setDisplay(display === '0' ? value : display.length < 15 ? display + value : display);
  }
  function decimal() {
    if (display === 'Error' || waiting) { setDisplay('0.'); setWaiting(false); }
    else if (!display.includes('.')) setDisplay(display + '.');
  }
  function clear() { setDisplay('0'); setStored(null); setOperator(null); setWaiting(false); }
  function backspace() { if (waiting || display === 'Error') return clear(); setDisplay(display.length <= 1 ? '0' : display.slice(0, -1)); }
  function chooseOperator(next: Operator) {
    const value = Number(display);
    if (!Number.isFinite(value)) return clear();
    if (stored !== null && operator && !waiting) {
      const result = calculate(stored, value, operator);
      if (result === null) { setDisplay('Error'); setStored(null); setOperator(null); return; }
      setStored(result); setDisplay(format(result));
    } else setStored(value);
    setOperator(next); setWaiting(true);
  }
  function equals() {
    if (stored === null || !operator || waiting) return;
    const result = calculate(stored, Number(display), operator);
    setDisplay(result === null ? 'Error' : format(result));
    setStored(null); setOperator(null); setWaiting(true);
  }
  function press(value: string) {
    if (/^\d$/.test(value)) digit(value);
    else if (value === '.') decimal();
    else if (value === 'C') clear();
    else if (value === '⌫') backspace();
    else if (value === '=') equals();
    else chooseOperator(value as Operator);
  }

  const keys = ['C', '⌫', '÷', '×', '7', '8', '9', '−', '4', '5', '6', '+', '1', '2', '3', '=', '0', '.', '', ''];
  return <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, s.overlay]}>
    <Animated.View pointerEvents={open ? 'none' : 'auto'} style={[s.launcherPosition, { opacity: open ? 0 : 1, transform: launcherPosition.getTranslateTransform() }]} {...launcherResponder.panHandlers}>
      <Pressable accessibilityLabel="Open calculator" android_ripple={{ color: 'transparent' }} onPress={openCalculator} style={({ pressed }) => [s.launcher, pressed && s.launcherPressed]}><Ionicons name="calculator" size={21} color="white" /></Pressable>
    </Animated.View>
    {open && <Animated.View style={[s.panelPosition, { width: panelWidth, transform: panelPosition.getTranslateTransform() }]}>
      <View style={s.panel}>
        <View style={s.header} {...panelResponder.panHandlers}><View style={s.handleLabel}><Ionicons name="move-outline" size={17} color={colors.muted} /><Text style={s.headerText}>Calculator</Text></View><Pressable accessibilityLabel="Close calculator" onPress={closeCalculator} hitSlop={10}><Ionicons name="close" size={21} color={colors.ink} /></Pressable></View>
        <View style={s.display}><Text numberOfLines={1} adjustsFontSizeToFit style={[s.displayText, display === 'Error' && { color: colors.red }]}>{display}</Text></View>
        <View style={s.keys}>{keys.map((key, index) => key ? <Pressable key={`${key}-${index}`} onPress={() => press(key)} style={[s.key, ['+', '−', '×', '÷', '='].includes(key) && s.operatorKey, key === 'C' && s.clearKey]}><Text style={[s.keyText, ['+', '−', '×', '÷', '='].includes(key) && { color: 'white' }, key === 'C' && { color: colors.red }]}>{key}</Text></Pressable> : <View key={`blank-${index}`} style={s.key} />)}</View>
        <Text style={s.disclaimer}>Calculator only · values are not saved</Text>
      </View>
    </Animated.View>}
  </View>;
}

const s = StyleSheet.create({
  overlay: { zIndex: 1000 },
  launcherPosition: { position: 'absolute', left: 0, top: 0, width: LAUNCHER_SIZE, height: LAUNCHER_SIZE, zIndex: 1001, elevation: 21, borderRadius: LAUNCHER_SIZE / 2 },
  launcher: { width: LAUNCHER_SIZE, height: LAUNCHER_SIZE, borderRadius: LAUNCHER_SIZE / 2, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', shadowColor: '#0C321F', shadowOpacity: .18, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  launcherPressed: { transform: [{ scale: .94 }] },
  panelPosition: { position: 'absolute', left: 0, top: 0, zIndex: 1002, elevation: 22 },
  panel: { backgroundColor: '#FBFCFA', borderRadius: 22, padding: 12, borderWidth: 1, borderColor: colors.line, shadowColor: '#10271C', shadowOpacity: .25, shadowRadius: 18, elevation: 18 },
  header: { height: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  handleLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerText: { color: colors.ink, fontWeight: '800', fontSize: 12 },
  display: { height: 66, borderRadius: 14, backgroundColor: colors.cream, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 13, marginVertical: 7 },
  displayText: { color: colors.ink, fontSize: 30, fontWeight: '700' },
  keys: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  key: { width: '23%', height: 43, borderRadius: 12, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  operatorKey: { backgroundColor: colors.green },
  clearKey: { backgroundColor: '#FFF0EE' },
  keyText: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  disclaimer: { textAlign: 'center', color: colors.muted, fontSize: 9, marginTop: 9 },
});
