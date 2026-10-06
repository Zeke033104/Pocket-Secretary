import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth } from './firebase';
import { PocketMark } from './LaunchReveal';
import { PocketWordImage } from './LogoAssets';
import { FadeInView } from './animations';

const palette = { navy: '#11173F', green: '#07924D', bright: '#19AE61', mint: '#E9FFF5', line: '#D2D9E1', muted: '#586582', white: '#FFFFFF', red: '#C94747' };

function friendlyError(code?: string) {
  if (code === 'auth/invalid-credential') return 'Incorrect email or password.';
  if (code === 'auth/email-already-in-use') return 'An account already uses this email.';
  if (code === 'auth/weak-password') return 'Use a password with at least 6 characters.';
  if (code === 'auth/invalid-email') return 'Enter a valid email address.';
  if (code === 'auth/network-request-failed') return 'Check your internet connection and try again.';
  return 'Something went wrong. Please try again.';
}

function Brand() {
  return <View style={s.brandWrap}><PocketMark size={80} /><View style={s.authWordmark}><PocketWordImage width={154} /></View><Text style={s.tagline}>Track today. Brighter tomorrows.</Text></View>;
}

function Field({ label, icon, value, onChangeText, placeholder, secure, visible, onToggle, autoComplete, keyboardType }: any) {
  return <View style={s.fieldWrap}><Text style={s.label}>{label}</Text><View style={[s.inputWrap, value && s.inputActive]}><Ionicons name={icon} size={20} color="#64738C" /><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#9BA6B5" secureTextEntry={secure && !visible} autoCapitalize="none" autoComplete={autoComplete} keyboardType={keyboardType} style={s.input} />{secure && <Pressable hitSlop={10} onPress={onToggle}><Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={21} color="#4D617B" /></Pressable>}</View></View>;
}

export function AuthScreen() {
  const { top, bottom } = useSafeAreaInsets();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState(''); const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false); const [showConfirm, setShowConfirm] = useState(false);
  const [remember, setRemember] = useState(true); const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const strong = password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password);

  function changeMode(next: 'login' | 'signup') { setMode(next); setError(''); }

  async function submit() {
    if (!email.trim() || password.length < 6) { setError('Enter a valid email and a password of at least 6 characters.'); return; }
    if (mode === 'signup' && !name.trim()) { setError('Please enter your full name.'); return; }
    if (mode === 'signup' && password !== confirm) { setError('Your passwords do not match.'); return; }
    if (mode === 'signup' && !accepted) { setError('Please agree to the Terms and Privacy Policy.'); return; }
    setBusy(true); setError('');
    try {
      if (mode === 'signup') { const result = await createUserWithEmailAndPassword(auth, email.trim(), password); await updateProfile(result.user, { displayName: name.trim() }); }
      else await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (caught: any) { setError(friendlyError(caught?.code)); }
    finally { setBusy(false); }
  }

  async function resetPassword() {
    if (!email.trim()) { setError('Enter your email first, then tap Forgot password.'); return; }
    try { await sendPasswordResetEmail(auth, email.trim()); Alert.alert('Check your inbox', 'We sent you a password reset link.'); }
    catch (caught: any) { setError(friendlyError(caught?.code)); }
  }

  return <LinearGradient colors={['#EEFFF7', '#F8FFFC', '#E5FFF2']} style={s.page}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: top + 16, paddingBottom: bottom + 22 }}>
    <FadeInView><Brand /></FadeInView>
    <View style={s.card}><View style={s.tabs}><Pressable onPress={() => changeMode('login')} style={[s.tab, mode === 'login' && s.tabActive]}><Text style={[s.tabText, mode === 'login' && s.tabTextActive]}>Log in</Text></Pressable><Pressable onPress={() => changeMode('signup')} style={[s.tab, mode === 'signup' && s.tabActive]}><Text style={[s.tabText, mode === 'signup' && s.tabTextActive]}>Sign up</Text></Pressable></View>
      <FadeInView key={mode} distance={6}>
      <Text style={s.title}>{mode === 'login' ? 'Welcome back' : 'Start your money journey'}</Text><Text style={s.subtitle}>{mode === 'login' ? "Let’s keep your money on track." : 'A little clarity for every peso.'}</Text>
      {mode === 'signup' && <Field label="Full name" icon="person-outline" value={name} onChangeText={setName} placeholder="Your full name" autoComplete="name" />}
      <Field label="Email" icon="mail-outline" value={email} onChangeText={setEmail} placeholder="you@email.com" autoComplete="email" keyboardType="email-address" />
      <Field label="Password" icon="lock-closed-outline" value={password} onChangeText={setPassword} placeholder="At least 6 characters" secure visible={showPassword} onToggle={() => setShowPassword(!showPassword)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
      {mode === 'signup' && <><View style={s.strengthRow}><View style={[s.strength, password.length > 0 && s.strengthOn]} /><View style={[s.strength, password.length >= 6 && s.strengthOn]} /><View style={[s.strength, strong && s.strengthOn]} /><Text style={s.strengthText}>{strong ? 'Strong password' : 'Use 8+ characters, a capital and number'}</Text></View><Field label="Confirm password" icon="lock-closed-outline" value={confirm} onChangeText={setConfirm} placeholder="Repeat your password" secure visible={showConfirm} onToggle={() => setShowConfirm(!showConfirm)} autoComplete="new-password" /></>}
      {mode === 'login' ? <View style={s.options}><Pressable onPress={() => setRemember(!remember)} style={s.checkRow}><View style={[s.checkbox, remember && s.checked]}>{remember && <Ionicons name="checkmark" size={16} color="white" />}</View><Text style={s.optionText}>Remember me</Text></Pressable><Pressable onPress={resetPassword}><Text style={s.link}>Forgot password?</Text></Pressable></View> : <Pressable onPress={() => setAccepted(!accepted)} style={[s.checkRow, { marginTop: 16 }]}><View style={[s.checkbox, accepted && s.checked]}>{accepted && <Ionicons name="checkmark" size={16} color="white" />}</View><Text style={s.optionText}>I agree to the <Text style={s.link}>Terms</Text> and <Text style={s.link}>Privacy Policy</Text></Text></Pressable>}
      {!!error && <Text style={s.error}>{error}</Text>}
      <Pressable onPress={submit} disabled={busy} style={[s.button, busy && { opacity: .65 }]}>{busy ? <ActivityIndicator color="white" /> : <><Text style={s.buttonText}>{mode === 'login' ? 'Log in' : 'Create account'}</Text><Ionicons name="arrow-forward" size={21} color="white" /></>}</Pressable>
      <View style={s.bottomSwitch}><View style={s.rule} /><Text style={s.bottomText}>{mode === 'login' ? 'New here? ' : 'Already have an account? '}<Text onPress={() => changeMode(mode === 'login' ? 'signup' : 'login')} style={s.link}>{mode === 'login' ? 'Create an account' : 'Log in'}</Text></Text><View style={s.rule} /></View>
      </FadeInView>
    </View>
  </ScrollView></KeyboardAvoidingView></LinearGradient>;
}

const s = StyleSheet.create({
  page: { flex: 1 }, brandWrap: { alignItems: 'center', marginBottom: 22 }, authWordmark: { marginTop: 4 }, tagline: { color: palette.muted, marginTop: 7, fontSize: 13 },
  card: { backgroundColor: palette.white, marginHorizontal: 16, borderRadius: 30, padding: 20, shadowColor: '#48B984', shadowOpacity: .13, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } }, signupCard: { marginTop: 28 }, tabs: { height: 52, backgroundColor: '#F1F3F5', borderRadius: 18, padding: 3, flexDirection: 'row', marginBottom: 20 }, tab: { flex: 1, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, tabActive: { backgroundColor: palette.green, shadowColor: palette.green, shadowOpacity: .2, shadowRadius: 8 }, tabText: { color: '#33435E', fontWeight: '700', fontSize: 15 }, tabTextActive: { color: 'white' }, title: { color: palette.navy, fontSize: 28, fontWeight: '900', letterSpacing: -.8 }, subtitle: { color: palette.muted, fontSize: 16, marginTop: 4, marginBottom: 10 }, fieldWrap: { marginTop: 15 }, label: { color: '#24334E', fontSize: 13, fontWeight: '600', marginBottom: 7 }, inputWrap: { height: 52, borderWidth: 1.2, borderColor: palette.line, borderRadius: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: '#FFF' }, inputActive: { borderColor: '#9BCFB4' }, input: { flex: 1, color: palette.navy, fontSize: 15, height: '100%' }, options: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }, checkRow: { flexDirection: 'row', alignItems: 'center', gap: 9 }, checkbox: { width: 23, height: 23, borderWidth: 1.5, borderColor: '#B9C3CE', borderRadius: 4, alignItems: 'center', justifyContent: 'center' }, checked: { backgroundColor: palette.green, borderColor: palette.green }, optionText: { color: '#394963', fontSize: 13 }, link: { color: '#008C48', fontWeight: '700' }, strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 9 }, strength: { height: 5, flex: 1, borderRadius: 4, backgroundColor: '#E2E7EA' }, strengthOn: { backgroundColor: palette.bright }, strengthText: { color: palette.green, fontSize: 9, marginLeft: 4, maxWidth: 120 }, error: { color: palette.red, fontSize: 12, marginTop: 13, lineHeight: 17 }, button: { height: 58, borderRadius: 18, backgroundColor: palette.green, flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'center', marginTop: 20, shadowColor: palette.green, shadowOpacity: .24, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } }, buttonText: { color: 'white', fontWeight: '900', fontSize: 18 }, bottomSwitch: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 24, marginBottom: 2 }, rule: { height: 1, backgroundColor: '#E2E6E9', flex: 1 }, bottomText: { color: '#647188', fontSize: 11 },
});
