# Firebase setup for Pocket Secretary

Pocket Secretary uses the existing Firebase project for Authentication, Cloud Firestore, Cloud Storage, and one callable Cloud Function. Do not create a second project.

## Billing prerequisite

Cloud Storage for Firebase and deployed Cloud Functions require the pay-as-you-go **Blaze** plan. In Firebase Console, open **Project settings → Usage and billing → Details & settings**, link a billing account, and create budget alerts before deploying. Firebase still provides no-cost usage allowances, but Blaze permits billable overages.

## 1. Install project dependencies

From the project root:

```powershell
npm install
npm --prefix functions install
```

Install the Firebase CLI if `firebase --version` is not recognized:

```powershell
npm install -g firebase-tools
firebase login
```

## 2. Confirm the existing app configuration

Copy `.env.example` to `.env` if needed and use the Web app configuration from **Firebase Console → Project settings → General → Your apps**:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIza...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
EXPO_PUBLIC_FIREBASE_FUNCTIONS_REGION=us-central1
```

Never commit `.env`, service-account JSON, private keys, or signing keys. The deletion function uses Google-managed Admin SDK credentials after deployment; no service account belongs in this repository.

## 3. Authentication

1. Open **Build → Authentication → Sign-in method**.
2. Enable **Email/Password**.
3. In **Settings → Password policy**, choose a suitable minimum password policy.

The current deletion flow reauthenticates with the account's current password. If additional sign-in providers are added later, add a matching reauthentication UI for each provider before enabling deletion for it.

## 4. Firestore

1. Open **Build → Firestore Database** and create the database if it does not exist.
2. Choose the existing database region and production mode.
3. Copy `firestore.rules` into **Firestore Database → Rules** and publish it.

Or deploy only these rules after associating the CLI with the existing project:

```powershell
firebase use --add
firebase deploy --only firestore:rules
```

## 5. Cloud Storage and profile photos

1. Upgrade the project to Blaze if required.
2. Open **Build → Storage** and select **Get started**.
3. Create the default bucket. Prefer a region near the app's users and consider an Always Free eligible US region if appropriate for the project.
4. Confirm `.env` contains the exact bucket shown in Firebase configuration.
5. Copy `storage.rules` into **Storage → Rules** and publish it.

Or deploy from the project root:

```powershell
firebase deploy --only storage
```

The rules permit a signed-in user to read, create, update, or delete only `users/<their UID>/profile/*`. Uploads must be images and no larger than 5 MB. Everything else is denied.

## 6. Callable account-deletion function

The function is located at `functions/src/index.ts`. It:

- requires a verified Firebase Authentication callable token;
- requires authentication within the last five minutes;
- derives the deletion UID only from `request.auth.uid`;
- recursively deletes `users/<uid>` and its nested Firestore collections;
- removes Storage objects under `users/<uid>/`;
- deletes the Auth user only after data cleanup succeeds;
- never accepts a client-provided UID.

Build it locally:

```powershell
npm --prefix functions run build
```

Deploy it manually when ready:

```powershell
firebase use --add
firebase deploy --only functions:deleteAccount
```

Do not change the function region without also changing `EXPO_PUBLIC_FIREBASE_FUNCTIONS_REGION`. Restart Expo after changing `.env`.

## 7. Local run

```powershell
npx expo start --clear
```

## 8. Test checklist

Use a disposable test account, not your primary data:

1. Register and confirm the user appears under Authentication.
2. Create wallets and transactions and confirm they appear under `users/<uid>` in Firestore.
3. Open Profile, change the display name, upload an image under 5 MB, restart, and confirm both persist.
4. Confirm the file is at `users/<uid>/profile/avatar` in Storage.
5. Sign in as a second account and verify it cannot read the first account's Firestore data or profile image.
6. Test an incorrect deletion password; nothing should be deleted.
7. Cancel both deletion confirmation steps.
8. With a disposable account, enter the correct password and confirm Firestore data, Storage objects, and the Authentication user are removed.
9. Disable networking and verify profile updates and deletion show an error rather than reporting success.

For local server-side testing, configure the Firebase Emulator Suite before pointing the client at emulators. The production client is not automatically connected to emulators.

## Troubleshooting

- **Missing or insufficient permissions:** publish both `firestore.rules` and `storage.rules` to the same project used in `.env`.
- **`storage/unauthorized`:** confirm the user is signed in and the Storage rules are deployed.
- **`storage/unknown` or bucket errors:** confirm Storage is enabled, Blaze billing is active, and `storageBucket` is correct.
- **`functions/not-found`:** deploy `deleteAccount` and confirm the client/function regions match.
- **Recent authentication required:** sign out, sign in again, and retry with the current password.
- **Deletion not confirmed:** inspect **Firebase Console → Functions → Logs**. Do not assume the account was deleted.
