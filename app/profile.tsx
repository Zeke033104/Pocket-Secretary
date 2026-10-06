import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { EmailAuthProvider, reauthenticateWithCredential, signOut, updateProfile } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/auth';
import { auth, functions, storage } from '@/firebase';
import { colors } from '@/theme';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function initials(name: string | null, email: string | null) {
  const source = name?.trim() || email?.split('@')[0] || 'User';
  return source.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
}

export default function ProfileScreen() {
  const { top, bottom } = useSafeAreaInsets(); const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.displayName || ''); const [saving, setSaving] = useState(false); const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(''); const [deleteOpen, setDeleteOpen] = useState(false); const [password, setPassword] = useState(''); const [deleting, setDeleting] = useState(false);

  async function saveName() {
    if (!user || !name.trim()) { setMessage('Enter a display name.'); return; }
    setSaving(true); setMessage('');
    try { await updateProfile(user, { displayName: name.trim() }); await refreshUser(); setMessage('Profile updated.'); }
    catch { setMessage('Could not update your profile. Check your connection.'); }
    finally { setSaving(false); }
  }

  async function choosePhoto() {
    if (!user) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Photo permission needed', 'Allow photo access to choose a profile image.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: .82 });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_IMAGE_BYTES) { Alert.alert('Image too large', 'Choose an image smaller than 5 MB.'); return; }
    setUploading(true); setMessage('');
    try {
      const response = await fetch(asset.uri); const blob = await response.blob();
      if (blob.size > MAX_IMAGE_BYTES) throw new Error('Image is larger than 5 MB.');
      const imageRef = ref(storage, `users/${user.uid}/profile/avatar`);
      await uploadBytes(imageRef, blob, { contentType: asset.mimeType || 'image/jpeg' });
      const url = await getDownloadURL(imageRef);
      await updateProfile(user, { photoURL: `${url}${url.includes('?') ? '&' : '?'}updated=${Date.now()}` });
      await refreshUser(); setMessage('Profile photo updated.');
    } catch (error: any) { setMessage(error?.message?.includes('5 MB') ? error.message : 'Could not upload the photo. Check Storage rules and your connection.'); }
    finally { setUploading(false); }
  }

  function removePhoto() {
    if (!user?.photoURL) return;
    Alert.alert('Remove profile photo?', 'Your initials will be shown instead.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: async () => {
      setUploading(true); setMessage('');
      try { await deleteObject(ref(storage, `users/${user.uid}/profile/avatar`)).catch(() => undefined); await updateProfile(user, { photoURL: null }); await refreshUser(); setMessage('Profile photo removed.'); }
      catch { setMessage('Could not remove the profile photo.'); } finally { setUploading(false); }
    } }]);
  }

  function beginDeletion() {
    Alert.alert('Delete your account?', 'This permanently deletes your wallets, transactions, transfers, budgets, profile image, and login. This cannot be undone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Continue', style: 'destructive', onPress: () => setDeleteOpen(true) }]);
  }

  function confirmSignOut() {
    Alert.alert('Sign out?', 'You can sign back in at any time.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', onPress: () => signOut(auth) }]);
  }

  function confirmDeletion() {
    if (!password) { setMessage('Enter your current password to continue.'); return; }
    Alert.alert('Final confirmation', 'Delete your Pocket Secretary account and all finance data permanently?', [{ text: 'Keep account', style: 'cancel' }, { text: 'Delete forever', style: 'destructive', onPress: deleteAccount }]);
  }

  async function deleteAccount() {
    if (!user?.email) return;
    setDeleting(true); setMessage('');
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
      const callable = httpsCallable<void, { success: boolean }>(functions, 'deleteAccount');
      const result = await callable();
      if (!result.data?.success) throw new Error('The server did not confirm deletion.');
      await signOut(auth).catch(() => undefined);
      Alert.alert('Account deleted', 'Your account and Pocket Secretary data were deleted.');
    } catch (error: any) {
      const code = String(error?.code || '');
      if (code.includes('wrong-password') || code.includes('invalid-credential')) setMessage('The password is incorrect. Your account was not deleted.');
      else if (code.includes('network')) setMessage('Network error. Nothing is reported as deleted; reconnect and try again.');
      else setMessage('Deletion was not confirmed. Your account may require cleanup support if the server partially failed. Please retry before assuming it was deleted.');
    } finally { setDeleting(false); }
  }

  if (!user) return null;
  return <KeyboardAvoidingView style={s.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={{ paddingTop: top + 14, paddingBottom: bottom + 30, paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled"><View style={s.header}><Pressable onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color={colors.ink} /></Pressable><Text style={s.headerTitle}>Profile</Text><Pressable onPress={confirmSignOut} style={s.headerSignOut}><Ionicons name="log-out-outline" size={16} color={colors.green} /><Text style={s.headerSignOutText}>Sign out</Text></Pressable></View>
    <View style={s.avatarWrap}>{user.photoURL ? <Image source={{ uri: user.photoURL }} style={s.avatar} /> : <View style={[s.avatar, s.fallback]}><Text style={s.initials}>{initials(user.displayName, user.email)}</Text></View>}{uploading && <View style={[s.avatar, s.uploadOverlay]}><ActivityIndicator color="white" /></View>}<Pressable onPress={choosePhoto} disabled={uploading} style={s.camera}><Ionicons name="camera" size={18} color="white" /></Pressable></View>
    <Pressable onPress={choosePhoto} disabled={uploading}><Text style={s.changePhoto}>{uploading ? 'Uploading…' : user.photoURL ? 'Change profile photo' : 'Add profile photo'}</Text></Pressable>{user.photoURL && <Pressable onPress={removePhoto}><Text style={s.removePhoto}>Remove photo</Text></Pressable>}
    <View style={s.card}><Text style={s.label}>DISPLAY NAME</Text><TextInput value={name} onChangeText={setName} placeholder="Your name" style={s.input} /><Text style={s.label}>EMAIL</Text><View style={s.readonly}><Ionicons name="mail-outline" size={19} color={colors.muted} /><Text style={s.email}>{user.email}</Text></View><Pressable disabled={saving} onPress={saveName} style={s.primary}><Text style={s.primaryText}>{saving ? 'Saving…' : 'Save profile'}</Text></Pressable></View>
    {!!message && <Text style={[s.message, message.includes('updated') || message.includes('removed') ? { color: colors.green } : null]}>{message}</Text>}
    <View style={s.danger}><Text style={s.dangerTitle}>Danger zone</Text><Text style={s.dangerBody}>Deleting your account permanently removes all finance records and cannot be undone.</Text><Pressable onPress={beginDeletion} style={s.deleteButton}><Ionicons name="trash-outline" size={18} color={colors.red} /><Text style={s.deleteText}>Delete account</Text></Pressable>
      {deleteOpen && <View style={s.deletePanel}><Text style={s.deletePrompt}>Enter your current password to verify it’s you.</Text><TextInput value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" placeholder="Current password" style={s.input} /><View style={s.deleteActions}><Pressable onPress={() => { setDeleteOpen(false); setPassword(''); }} style={s.cancel}><Text style={s.cancelText}>Cancel</Text></Pressable><Pressable disabled={deleting} onPress={confirmDeletion} style={s.confirmDelete}><Text style={s.confirmText}>{deleting ? 'Deleting…' : 'Continue'}</Text></Pressable></View></View>}
    </View>
  </ScrollView></KeyboardAvoidingView>;
}

const s = StyleSheet.create({ page: { flex: 1, backgroundColor: colors.cream }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }, back: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' }, headerTitle: { color: colors.ink, fontWeight: '800', fontSize: 20 }, headerSignOut: { height: 38, borderRadius: 12, backgroundColor: colors.mint, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 5 }, headerSignOutText: { color: colors.green, fontWeight: '800', fontSize: 11 }, avatarWrap: { width: 112, height: 112, alignSelf: 'center', marginBottom: 10 }, avatar: { width: 112, height: 112, borderRadius: 56 }, fallback: { backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' }, initials: { color: 'white', fontSize: 34, fontWeight: '800' }, uploadOverlay: { position: 'absolute', backgroundColor: '#10271CAA', alignItems: 'center', justifyContent: 'center' }, camera: { position: 'absolute', right: 0, bottom: 0, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.green, borderWidth: 3, borderColor: colors.cream, alignItems: 'center', justifyContent: 'center' }, changePhoto: { color: colors.green, fontWeight: '800', textAlign: 'center', fontSize: 13 }, removePhoto: { color: colors.red, textAlign: 'center', fontSize: 11, marginTop: 7 }, card: { backgroundColor: 'white', borderRadius: 21, padding: 17, marginTop: 24 }, label: { fontSize: 9, letterSpacing: 1, fontWeight: '800', color: colors.muted, marginBottom: 7, marginTop: 8 }, input: { height: 50, backgroundColor: colors.cream, borderRadius: 13, paddingHorizontal: 14, color: colors.ink, borderWidth: 1, borderColor: colors.line }, readonly: { height: 50, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#F0F1EE', borderRadius: 13, paddingHorizontal: 14 }, email: { color: colors.muted, fontSize: 14 }, primary: { height: 52, backgroundColor: colors.green, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 18 }, primaryText: { color: 'white', fontWeight: '800' }, message: { color: colors.red, textAlign: 'center', marginVertical: 13, fontSize: 12, lineHeight: 18 }, danger: { borderWidth: 1, borderColor: '#F0C8C3', backgroundColor: '#FFF8F7', borderRadius: 20, padding: 17, marginTop: 28 }, dangerTitle: { color: colors.red, fontWeight: '800', fontSize: 16 }, dangerBody: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 6 }, deleteButton: { height: 48, borderWidth: 1, borderColor: '#E8AFA8', borderRadius: 14, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', marginTop: 14 }, deleteText: { color: colors.red, fontWeight: '800' }, deletePanel: { marginTop: 16, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F0D2CE' }, deletePrompt: { color: colors.ink, fontSize: 12, marginBottom: 9 }, deleteActions: { flexDirection: 'row', gap: 9, marginTop: 10 }, cancel: { flex: 1, height: 45, backgroundColor: 'white', borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, cancelText: { color: colors.ink, fontWeight: '700' }, confirmDelete: { flex: 1, height: 45, backgroundColor: colors.red, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, confirmText: { color: 'white', fontWeight: '800' } });
