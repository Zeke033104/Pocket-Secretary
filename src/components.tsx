import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useMemo, useRef } from 'react';
import { ActivityIndicator, Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { pesos } from './money';
import { colors } from './theme';
import { Transaction, Wallet } from './types';
import { FadeInView } from './animations';

const icons: Record<string, keyof typeof Ionicons.glyphMap> = { Food: 'restaurant-outline', Transport: 'bus-outline', School: 'school-outline', Bills: 'flash-outline', Shopping: 'bag-handle-outline', Entertainment: 'game-controller-outline', Health: 'medkit-outline', Allowance: 'cash-outline', Salary: 'briefcase-outline', Gift: 'gift-outline', Other: 'ellipsis-horizontal' };
const DELETE_REVEAL = 70;

export function ScreenHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return <FadeInView><View style={s.header}><View style={{ flex: 1 }}>{eyebrow && <Text style={s.eyebrow}>{eyebrow}</Text>}<Text style={s.title}>{title}</Text></View>{action}</View></FadeInView>;
}

export function TransactionRow({ item, wallet }: { item: Transaction; wallet?: Wallet }) {
  const income = item.type === 'income';
  return <FadeInView><View style={s.row}><View style={[s.icon, { backgroundColor: income ? '#DDF4E6' : '#FFF0E7' }]}><Ionicons name={icons[item.category] || 'ellipsis-horizontal'} size={19} color={income ? '#18824B' : '#D8783D'} /></View><View style={{ flex: 1 }}><Text numberOfLines={1} style={s.note}>{item.description}</Text><Text style={s.meta}>{item.category} · {wallet?.name || 'Unassigned'} · {item.transactionDate}</Text></View><Text style={[s.amount, { color: income ? '#16854A' : colors.ink }]}>{income ? '+' : '−'}{pesos(item.amountCents)}</Text></View></FadeInView>;
}

export function SwipeableTransactionRow({ item, wallet, onPress, onDelete }: { item: Transaction; wallet?: Wallet; onPress?: () => void; onDelete: () => void }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const restingX = useRef(0);
  const dragStartX = useRef(0);
  function settle(toValue: number) {
    restingX.current = toValue;
    Animated.spring(translateX, { toValue, useNativeDriver: true, damping: 22, stiffness: 260, mass: .75 }).start();
  }
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
    onPanResponderGrant: () => { dragStartX.current = restingX.current; translateX.stopAnimation(); },
    onPanResponderMove: (_, gesture) => translateX.setValue(Math.max(0, Math.min(DELETE_REVEAL + 18, dragStartX.current + gesture.dx))),
    onPanResponderRelease: (_, gesture) => settle(dragStartX.current + gesture.dx > DELETE_REVEAL * .45 ? DELETE_REVEAL : 0),
    onPanResponderTerminate: () => settle(restingX.current),
  }), [translateX]);
  function deletePressed() { settle(0); onDelete(); }
  return <View style={s.swipeRow}>
    <Pressable accessibilityLabel={`Delete ${item.description}`} onPress={deletePressed} style={s.deleteAction}><Ionicons name="trash-outline" size={22} color="white" /><Text style={s.deleteText}>Delete</Text></Pressable>
    <Animated.View {...responder.panHandlers} style={[s.swipeContent, { transform: [{ translateX }] }]}><Pressable onPress={onPress}><TransactionRow item={item} wallet={wallet} /></Pressable></Animated.View>
  </View>;
}

export function LoadingState({ label = 'Loading your finances…' }: { label?: string }) { return <View style={s.state}><ActivityIndicator color={colors.green} /><Text style={s.stateText}>{label}</Text></View>; }
export function EmptyState({ icon, title, body }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }) { return <View style={s.state}><Ionicons name={icon} size={34} color="#9BA79F" /><Text style={s.emptyTitle}>{title}</Text><Text style={s.stateText}>{body}</Text></View>; }
export function ErrorState({ message }: { message: string }) { return <View style={[s.state, { backgroundColor: '#FFF0EE' }]}><Ionicons name="alert-circle-outline" size={27} color={colors.red} /><Text style={[s.stateText, { color: colors.red }]}>{message}</Text></View>; }

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 22 },
  eyebrow: { color: colors.muted, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  title: { color: colors.ink, fontSize: 29, fontWeight: '800', letterSpacing: -1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.line },
  swipeRow: { position: 'relative', overflow: 'hidden', backgroundColor: colors.red },
  swipeContent: { backgroundColor: 'white' },
  deleteAction: { position: 'absolute', left: 0, top: 0, bottom: 0, width: DELETE_REVEAL, alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: colors.red },
  deleteText: { color: 'white', fontSize: 9, fontWeight: '800' },
  icon: { width: 41, height: 41, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  note: { fontSize: 14, fontWeight: '700', color: colors.ink, marginBottom: 4 },
  meta: { fontSize: 10.5, color: colors.muted },
  amount: { fontWeight: '800', fontSize: 13 },
  state: { padding: 26, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'white', borderRadius: 20 },
  stateText: { color: colors.muted, textAlign: 'center', fontSize: 12, lineHeight: 18 },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
});
