import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Pressable } from 'react-native';
import { colors } from '@/theme';

function SmoothTabButton(props: any) {
  return <Pressable {...props} android_ripple={{ color: 'transparent' }} style={props.style} />;
}

export default function TabLayout() {
  return <Tabs screenOptions={{ headerShown: false, animation: 'fade', sceneStyle: { backgroundColor: colors.cream }, tabBarButton: (props) => <SmoothTabButton {...props} />, tabBarActiveTintColor: colors.green, tabBarInactiveTintColor: '#9AA39E', tabBarStyle: { height: 84, paddingTop: 8, paddingBottom: 24, borderTopColor: colors.line, backgroundColor: '#FCFCF9' }, tabBarLabelStyle: { fontSize: 11, fontWeight: '600' } }}>
    <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} /> }} />
    <Tabs.Screen name="activity" options={{ title: 'History', tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="wallets" options={{ title: 'Wallets', tabBarIcon: ({ color, size }) => <Ionicons name="wallet-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="budgets" options={{ title: 'Budgets', tabBarIcon: ({ color, size }) => <Ionicons name="pie-chart-outline" color={color} size={size} /> }} />
  </Tabs>;
}
