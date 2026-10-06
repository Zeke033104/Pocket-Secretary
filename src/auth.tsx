import { User, onAuthStateChanged } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { auth } from './firebase';

type AuthState = { user: User | null; loading: boolean; refreshUser: () => Promise<void> };
const AuthContext = createContext<AuthState>({ user: null, loading: true, refreshUser: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);

  useEffect(() => onAuthStateChanged(auth, (nextUser) => {
    setUser(nextUser);
    setLoading(false);
  }), []);

  const value = useMemo(() => ({ user, loading, refreshUser: async () => { await auth.currentUser?.reload(); setUser(auth.currentUser); setRevision((value) => value + 1); } }), [user, loading, revision]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
