import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Alert, Animated, Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, ErrorState, LoadingState, ScreenHeader, SwipeableTransactionRow } from '@/components';
import { TransactionForm, WalletForm } from '@/forms';
import { currentMonth, pesos, previousMonth } from '@/money';
import { useStore } from '@/store';
import { colors } from '@/theme';
import { useAuth } from '@/auth';
import { FadeInView } from '@/animations';

export default function Dashboard() {
  const { top } = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const store = useStore();
  const { user } = useAuth();
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const cardWidth = width - 36;
  const balanceScroll = useRef(new Animated.Value(0)).current;
  const month = currentMonth();
  const lastMonth = previousMonth(month);
  const monthly = store.transactions.filter((item) => item.transactionDate.startsWith(month));
  const income = monthly.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amountCents, 0);
  const expenses = monthly.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amountCents, 0);
  const balance = store.wallets.reduce((sum, wallet) => sum + store.walletBalance(wallet.id), 0);
  const budget = store.budgets.find((item) => item.month === month);
  const remaining = (budget?.overallCents || 0) - expenses;
  const categoryTotals = useMemo(() => monthly.filter((item) => item.type === 'expense').reduce<Record<string, number>>((all, item) => ({ ...all, [item.category]: (all[item.category] || 0) + item.amountCents }), {}), [store.transactions, month]);
  const categoryEntries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const lastExpenses = store.transactions.filter((item) => item.type === 'expense' && item.transactionDate.startsWith(lastMonth)).reduce((sum, item) => sum + item.amountCents, 0);
  let comparison = 'There is not enough prior-month data for a comparison.';
  if (lastExpenses > 0) {
    const delta = Math.round((expenses - lastExpenses) / lastExpenses * 100);
    comparison = `You spent ${Math.abs(delta)}% ${delta > 0 ? 'more' : delta < 0 ? 'less' : 'the same'} than last month.`;
  }
  function confirmDelete(id: string) {
    Alert.alert('Delete transaction?', 'This will immediately update the linked wallet balance and reports.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => store.removeTransaction(id).catch(() => Alert.alert('Could not delete', 'Check your connection and try again.')) },
    ]);
  }
  const avatarInitials = (user?.displayName || user?.email || 'U').split(/\s+|@/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');

  return <ScrollView style={s.page} contentContainerStyle={{ paddingTop: top + 16, paddingHorizontal: 18, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
    <ScreenHeader eyebrow={new Date().toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'long', month: 'long', day: 'numeric' })} title="Your finances" action={<Pressable accessibilityLabel="Open profile" onPress={() => router.push('/profile' as any)} style={s.avatarButton}>{user?.photoURL ? <Image source={{ uri: user.photoURL }} style={s.avatarImage} /> : <Text style={s.avatarText}>{avatarInitials}</Text>}</Pressable>} />
    {store.error && <ErrorState message={store.error} />}
    {!store.loaded ? <LoadingState /> : <>
      <FadeInView delay={40}>
        <Animated.ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={cardWidth + 10} decelerationRate="fast" onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: balanceScroll } } }], { useNativeDriver: false })} scrollEventThrottle={16} contentContainerStyle={s.carousel}>
          <LinearGradient colors={[colors.green, '#286548']} style={[s.hero, { width: cardWidth }]}>
            <Text style={s.heroLabel}>ALL WALLETS · COMBINED BALANCE</Text>
            <Text style={s.heroAmount}>{pesos(balance)}</Text>
            <View style={s.heroStats}><View style={s.heroStat}><Text style={s.heroMiniLabel}>ALL-WALLET INCOME THIS MONTH</Text><Text style={s.income}>+{pesos(income)}</Text></View><View style={s.heroStat}><Text style={s.heroMiniLabel}>ALL-WALLET EXPENSES THIS MONTH</Text><Text style={s.expense}>−{pesos(expenses)}</Text></View></View>
          </LinearGradient>
          {store.wallets.map((wallet, index) => {
            const walletMonthly = monthly.filter((item) => item.walletId === wallet.id);
            const walletIncome = walletMonthly.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amountCents, 0);
            const walletExpenses = walletMonthly.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amountCents, 0);
            return <LinearGradient key={wallet.id} colors={index % 2 ? ['#204A39', '#397459'] : ['#315546', '#173D2E']} style={[s.hero, { width: cardWidth }]}>
              <Text style={s.heroLabel}>WALLET {index + 1} OF {store.wallets.length}</Text>
              <Text style={s.walletCardName}>{wallet.name}</Text>
              <Text style={s.heroAmount}>{pesos(store.walletBalance(wallet.id))}</Text>
              <View style={s.heroStats}><View style={s.heroStat}><Text style={s.heroMiniLabel}>INCOME THIS MONTH</Text><Text style={s.income}>+{pesos(walletIncome)}</Text></View><View style={s.heroStat}><Text style={s.heroMiniLabel}>EXPENSES THIS MONTH</Text><Text style={s.expense}>−{pesos(walletExpenses)}</Text></View></View>
            </LinearGradient>;
          })}
        </Animated.ScrollView>
        {store.wallets.length > 0 && <View style={s.dots}>{[0, ...store.wallets.map((_, index) => index + 1)].map((page) => { const center = page * (cardWidth + 10); const inputRange = [center - (cardWidth + 10), center, center + (cardWidth + 10)]; return <Animated.View key={page} style={[s.dot, { width: balanceScroll.interpolate({ inputRange, outputRange: [6, 17, 6], extrapolate: 'clamp' }), backgroundColor: balanceScroll.interpolate({ inputRange, outputRange: ['#C9CECA', colors.green, '#C9CECA'], extrapolate: 'clamp' }) }]} />; })}</View>}
      </FadeInView>
      <Pressable onPress={() => store.wallets.length ? setTransactionOpen(true) : setWalletOpen(true)} style={s.add}><Ionicons name="add-circle" size={22} color="white" /><Text style={s.addText}>{store.wallets.length ? 'Add transaction' : 'Create your first wallet'}</Text></Pressable>
      <FadeInView delay={80}><View style={s.grid}><View style={s.metric}><Text style={s.metricLabel}>MONTHLY BUDGET</Text><Text style={[s.metricValue, remaining < 0 && { color: colors.red }]}>{budget ? pesos(remaining) : 'Not set'}</Text><Text style={s.metricSub}>{budget ? (remaining < 0 ? 'over budget' : 'remaining') : 'Set one in Budgets'}</Text></View><View style={s.metric}><Text style={s.metricLabel}>TOP CATEGORY</Text><Text style={s.metricValue}>{categoryEntries[0]?.[0] || '—'}</Text><Text style={s.metricSub}>{categoryEntries[0] ? pesos(categoryEntries[0][1]) : 'No expenses yet'}</Text></View></View></FadeInView>
      <Text style={s.heading}>Recent transactions</Text>
      {store.transactions.length ? <View style={s.card}>{store.transactions.slice(0, 5).map((item) => <SwipeableTransactionRow key={item.id} item={item} wallet={store.wallets.find((wallet) => wallet.id === item.walletId)} onDelete={() => confirmDelete(item.id)} />)}</View> : <EmptyState icon="receipt-outline" title="No transactions yet" body="Add income or an expense to start tracking." />}
      <Text style={s.heading}>Spending breakdown</Text>
      <View style={s.card}>{categoryEntries.length ? categoryEntries.slice(0, 5).map(([name, value]) => <View key={name} style={s.breakdown}><View style={s.breakdownLabel}><Text style={s.breakdownName}>{name}</Text><Text style={s.breakdownValue}>{pesos(value)}</Text></View><View style={s.track}><View style={[s.fill, { width: `${expenses ? value / expenses * 100 : 0}%` }]} /></View></View>) : <Text style={s.noData}>No expense data for this month.</Text>}</View>
      <Text style={s.heading}>Spending insights</Text>
      <View style={s.insight}><Ionicons name="sparkles" size={20} color={colors.green} /><View style={{ flex: 1 }}><Text style={s.insightTitle}>{categoryEntries[0] ? `${categoryEntries[0][0]} is your highest category` : 'Start logging to see patterns'}</Text><Text style={s.insightBody}>{comparison} {budget ? `${remaining >= 0 ? pesos(remaining) + ' remains' : pesos(-remaining) + ' over'} in your monthly budget.` : 'Set a monthly budget for remaining-budget insights.'}</Text></View></View>
    </>}
    <TransactionForm visible={transactionOpen} wallets={store.wallets} onClose={() => setTransactionOpen(false)} onSave={store.addTransaction} />
    <WalletForm visible={walletOpen} onClose={() => setWalletOpen(false)} onSave={store.addWallet} />
  </ScrollView>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream },
  avatarButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: 'white', fontWeight: '800', fontSize: 13 },
  carousel: { gap: 10 },
  hero: { minHeight: 190, borderRadius: 23, padding: 21, justifyContent: 'center' },
  heroLabel: { color: '#C7DCCE', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  heroAmount: { color: 'white', fontSize: 34, fontWeight: '800', marginTop: 7, letterSpacing: -1 },
  heroStats: { flexDirection: 'row', gap: 20, marginTop: 18 },
  heroStat: { flex: 1 },
  heroMiniLabel: { color: '#B8CFC1', fontSize: 7.5, fontWeight: '800', marginBottom: 4 },
  income: { color: colors.lime, fontWeight: '800' },
  expense: { color: '#FFD9C5', fontWeight: '800' },
  walletCardName: { color: '#D2E6DA', fontWeight: '700', fontSize: 15, marginTop: 10 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot: { height: 6, borderRadius: 3 },
  add: { height: 55, backgroundColor: colors.ink, borderRadius: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 },
  addText: { color: 'white', fontWeight: '800' },
  grid: { flexDirection: 'row', gap: 10, marginTop: 16 },
  metric: { flex: 1, minHeight: 104, padding: 14, borderRadius: 18, backgroundColor: 'white' },
  metricLabel: { fontSize: 9, color: colors.muted, fontWeight: '800', letterSpacing: .8 },
  metricValue: { fontSize: 17, color: colors.ink, fontWeight: '800', marginTop: 9 },
  metricSub: { fontSize: 10, color: colors.muted, marginTop: 4 },
  heading: { fontSize: 18, fontWeight: '800', color: colors.ink, marginTop: 26, marginBottom: 9 },
  card: { backgroundColor: 'white', borderRadius: 19, paddingHorizontal: 15, paddingVertical: 3, overflow: 'hidden' },
  breakdown: { paddingVertical: 10 },
  breakdownLabel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  breakdownName: { color: colors.ink, fontWeight: '700', fontSize: 13 },
  breakdownValue: { color: colors.ink, fontWeight: '800', fontSize: 12 },
  track: { height: 7, borderRadius: 4, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: 7, backgroundColor: colors.green, borderRadius: 4 },
  noData: { padding: 20, textAlign: 'center', color: colors.muted },
  insight: { flexDirection: 'row', gap: 11, padding: 16, backgroundColor: colors.mint, borderRadius: 19 },
  insightTitle: { color: colors.green, fontWeight: '800', marginBottom: 5 },
  insightBody: { color: '#466151', fontSize: 12, lineHeight: 18 },
});
