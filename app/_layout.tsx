import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StoreProvider } from '@/store';
import { AuthProvider, useAuth } from '@/auth';
import { AuthScreen } from '@/AuthScreen';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '@/theme';
import { useCallback, useState } from 'react';
import { LaunchReveal } from '@/LaunchReveal';

function AppGate() {
  const { user, loading } = useAuth();
  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream }}><ActivityIndicator color={colors.green} /></View>;
  if (!user) return <AuthScreen />;
  return (
    <StoreProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
    </StoreProvider>
  );
}

export default function RootLayout() {
  const [revealed, setRevealed] = useState(false);
  const finishReveal = useCallback(() => setRevealed(true), []);
  return <AuthProvider>{revealed ? <AppGate /> : <LaunchReveal onFinish={finishReveal} />}</AuthProvider>;
}
