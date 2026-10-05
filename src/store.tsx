import { addDoc, collection, deleteDoc, doc, getDocs, limit, onSnapshot, query, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './auth';
import { db } from './firebase';
import { Budget, Transaction, TransactionInput, Transfer, TransferInput, Wallet, WalletInput } from './types';

type Store = {
  transactions: Transaction[]; wallets: Wallet[]; transfers: Transfer[]; budgets: Budget[];
  loaded: boolean; error: string | null;
  addTransaction: (item: TransactionInput) => Promise<void>; updateTransaction: (id: string, item: TransactionInput) => Promise<void>; removeTransaction: (id: string) => Promise<void>;
  addWallet: (item: WalletInput) => Promise<void>; updateWallet: (id: string, item: WalletInput) => Promise<void>; removeWallet: (id: string) => Promise<void>;
  addTransfer: (item: TransferInput) => Promise<void>; removeTransfer: (id: string) => Promise<void>;
  saveBudget: (budget: Omit<Budget, 'id' | 'updatedAt'>) => Promise<void>;
  walletBalance: (walletId: string) => number;
};

const StoreContext = createContext<Store | null>(null);
const now = () => new Date().toISOString();

function normalizeTransaction(id: string, data: any): Transaction {
  return { id, amountCents: Number.isInteger(data.amountCents) ? data.amountCents : Math.round(Number(data.amount || 0) * 100), type: data.type === 'income' ? 'income' : 'expense', description: data.description || data.note || 'Expense', category: data.category || 'Other', walletId: data.walletId || '', transactionDate: data.transactionDate || String(data.date || '').slice(0, 10), createdAt: data.createdAt, updatedAt: data.updatedAt };
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]); const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]); const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loadedParts, setLoadedParts] = useState(0); const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTransactions([]); setWallets([]); setTransfers([]); setBudgets([]); setLoadedParts(0); setError(null);
    if (!user) return;
    const root = ['transactions', 'wallets', 'transfers', 'budgets'] as const;
    const setters = { transactions: (snap: any) => setTransactions(snap.docs.map((d: any) => normalizeTransaction(d.id, d.data())).sort((a: Transaction, b: Transaction) => b.transactionDate.localeCompare(a.transactionDate))), wallets: (snap: any) => setWallets(snap.docs.map((d: any) => ({ id: d.id, ...d.data() }))), transfers: (snap: any) => setTransfers(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })).sort((a: Transfer, b: Transfer) => b.transferDate.localeCompare(a.transferDate))), budgets: (snap: any) => setBudgets(snap.docs.map((d: any) => ({ id: d.id, ...d.data() }))) };
    return (() => { const stops = root.map((name) => onSnapshot(collection(db, 'users', user.uid, name), (snap) => { setters[name](snap); setLoadedParts((value) => Math.min(4, value + 1)); }, (reason) => { console.error(reason); setError('Could not sync your finance data. Check your connection and Firestore rules.'); setLoadedParts(4); })); return () => stops.forEach((stop) => stop()); })();
  }, [user]);

  function ref(name: string) { if (!user) throw new Error('You must be signed in.'); return collection(db, 'users', user.uid, name); }

  const value = useMemo<Store>(() => ({
    transactions, wallets, transfers, budgets, loaded: loadedParts >= 4, error,
    addTransaction: async (item) => { await addDoc(ref('transactions'), { ...item, createdAt: now(), updatedAt: now() }); },
    updateTransaction: async (id, item) => { if (!user) throw new Error('You must be signed in.'); const existing = transactions.find((value) => value.id === id); await setDoc(doc(db, 'users', user.uid, 'transactions', id), { ...item, createdAt: existing?.createdAt || now(), updatedAt: now() }); },
    removeTransaction: async (id) => { if (!user) throw new Error('You must be signed in.'); await deleteDoc(doc(db, 'users', user.uid, 'transactions', id)); },
    addWallet: async (item) => { await addDoc(ref('wallets'), { ...item, createdAt: now(), updatedAt: now() }); },
    updateWallet: async (id, item) => { if (!user) throw new Error('You must be signed in.'); await updateDoc(doc(db, 'users', user.uid, 'wallets', id), { ...item, updatedAt: now() }); },
    removeWallet: async (id) => {
      if (!user) throw new Error('You must be signed in.');
      const tx = await getDocs(query(ref('transactions'), where('walletId', '==', id), limit(1)));
      const outgoing = await getDocs(query(ref('transfers'), where('fromWalletId', '==', id), limit(1)));
      const incoming = await getDocs(query(ref('transfers'), where('toWalletId', '==', id), limit(1)));
      if (!tx.empty || !outgoing.empty || !incoming.empty) throw new Error('This wallet has linked transactions or transfers and cannot be deleted.');
      await deleteDoc(doc(db, 'users', user.uid, 'wallets', id));
    },
    addTransfer: async (item) => {
      if (!user) throw new Error('You must be signed in.');
      const batch = writeBatch(db); const transferRef = doc(ref('transfers'));
      batch.set(transferRef, { ...item, createdAt: now() }); await batch.commit();
    },
    removeTransfer: async (id) => { if (!user) throw new Error('You must be signed in.'); await deleteDoc(doc(db, 'users', user.uid, 'transfers', id)); },
    saveBudget: async (budget) => { if (!user) throw new Error('You must be signed in.'); await setDoc(doc(db, 'users', user.uid, 'budgets', budget.month), { ...budget, updatedAt: now() }); },
    walletBalance: (walletId) => {
      const wallet = wallets.find((item) => item.id === walletId); if (!wallet) return 0;
      const transactionChange = transactions.filter((item) => item.walletId === walletId).reduce((sum, item) => sum + (item.type === 'income' ? item.amountCents : -item.amountCents), 0);
      const transferChange = transfers.reduce((sum, item) => sum + (item.toWalletId === walletId ? item.amountCents : 0) - (item.fromWalletId === walletId ? item.amountCents : 0), 0);
      return wallet.openingBalanceCents + transactionChange + transferChange;
    },
  }), [transactions, wallets, transfers, budgets, loadedParts, error, user]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() { const context = useContext(StoreContext); if (!context) throw new Error('useStore must be used within StoreProvider'); return context; }
