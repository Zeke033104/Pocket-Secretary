# Firebase setup for Pocket Secretary

This guide assumes you have never used Firebase. You only need a Google account.

## 1. Create your Firebase project

1. Open [Firebase Console](https://console.firebase.google.com/).
2. Select **Create a project**.
3. Name it `Pocket Secretary` (the exact name is not important).
4. Google Analytics is optional for this app; you may turn it off.
5. Wait for Firebase to create the project, then select **Continue**.

## 2. Register the app

This Expo project uses the Firebase JavaScript SDK, so register a **Web app** even though the interface runs on a phone.

1. On **Project overview**, select the `</>` Web icon.
2. Use `Pocket Secretary App` as the nickname.
3. Do not enable Firebase Hosting.
4. Select **Register app**.
5. Firebase displays a `firebaseConfig` object. Keep this page open.

## 3. Add your Firebase configuration

1. In the project folder, copy `.env.example` to a new file named `.env`:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Copy each value from Firebase's `firebaseConfig` into the matching `.env` line. Do not add quotation marks:

   ```env
   EXPO_PUBLIC_FIREBASE_API_KEY=AIza...
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
   EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
   ```

3. Never commit `.env`. It is already ignored by Git. Firebase web configuration identifies the project; privacy is enforced by Authentication and Firestore Security Rules, not by treating this configuration as a secret.

## 4. Enable email/password authentication

1. In Firebase Console, open **Build → Authentication**.
2. Select **Get started**.
3. Open **Sign-in method**.
4. Select **Email/Password**, switch **Enable** on, and save.
5. Do not enable **Email link (passwordless sign-in)** for this version.

## 5. Create the Firestore database

1. Open **Build → Firestore Database**.
2. Select **Create database**.
3. Choose a database location near your users. This cannot easily be changed later.
4. Select **Start in production mode** and create the database.

You do not need to manually create collections. The app creates each signed-in user's transaction collection after their first expense.

## 6. Publish the privacy rules

1. In **Firestore Database**, open the **Rules** tab.
2. Replace everything in the editor with the contents of this project's `firestore.rules` file.
3. Select **Publish**.

The important condition is `request.auth.uid == userId`. It means a signed-in user can only access the documents stored under their own Firebase user ID. The final catch-all rule denies everything else.

## 7. Run and test

Restart Expo after creating or changing `.env`:

```powershell
npx expo start --clear
```

In the app:

1. Create an account using an email and a password of at least six characters.
2. Add an expense.
3. In Firebase Console, open **Firestore Database → Data**. You should see:

   ```text
   users / <your-user-id> / transactions / <transaction-id>
   ```

4. Sign out using the button at the top-right of Home.
5. Create a second account. It should not see the first account's expenses.

## Troubleshooting

- **`auth/operation-not-allowed`**: Enable Email/Password under Authentication → Sign-in method.
- **`permission-denied`**: Publish `firestore.rules` and confirm you are signed in.
- **Firebase configuration error**: Check every `.env` value, then restart Expo with `--clear`.
- **No data in Firestore**: Add an expense first; collections are created on the first write.
- **Network request failed**: Confirm the phone and development computer have internet access.

## Before publishing publicly

- Enable a stronger password policy in Authentication settings.
- Add email verification and password reset flows.
- Enable Firebase App Check to reduce abuse.
- Review Firebase usage and billing alerts.
- Test Firestore rules with two separate accounts or the Firebase Emulator Suite.
