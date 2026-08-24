// src/contexts/AuthContext.tsx
//
// This does NOT replace ILC's auth. It's a thin adapter so the ported
// convo-connect hooks (useMessages, useGroupChat, useCalls, useWebRTC,
// useLiveSession, useCallHistory, useFileUpload — all of which call
// useAuth() from this exact path) work with zero changes to their internals.
//
// It is only mounted around <StudentDashboard>, fed from the session
// Index.tsx already owns. It never talks to Supabase auth itself.

import React, { createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  user: User | null;
  session: Session | null;
  loading: boolean;
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  user,
  session,
  loading,
  children,
}) => {
  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
};