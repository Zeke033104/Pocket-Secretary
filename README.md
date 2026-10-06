# Pocket Secretary

A private, account-based mobile finance tracker built with Expo, React Native, and Firebase.

## Included

- Dashboard with live wallet balance, monthly income, expenses, budget, breakdowns, and calculated insights
- Income and expense capture with centavo-safe amounts, category, wallet, and transaction date
- Email/password account creation and sign-in
- Profile editing with Firebase Auth display name and Cloud Storage avatar
- Secure callable account deletion with recent-password reauthentication
- Cloud-synced Firestore wallets, transactions, transfers, and budgets, private to each account
- Searchable and filterable history with transaction editing and deletion
- Wallet creation, derived balances, and wallet-to-wallet transfers
- Overall and optional category monthly budgets with exceeded-budget indicators
- Honest calculated spending insights without an external AI API
- Swipeable combined and per-wallet balance cards
- A draggable, position-persistent calculator available throughout the app
- Android, iOS, and web support from one codebase

## Set up Firebase

Follow [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) before running the app. It covers project creation, Authentication, Firestore, environment variables, and security rules step by step.

## Run it

```bash
npm install
npm start
```

Scan the QR code with Expo Go on Android, or use the iPhone camera on iOS. The assistant currently gives local, deterministic summaries; production AI should be connected through a server so an API key is never embedded in the app.
