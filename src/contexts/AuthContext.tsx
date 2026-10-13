// src/contexts/AuthContext.tsx
// Thin adapter so the ported chat/call hooks can call useAuth().
// Fed from the session Index.tsx already owns; never talks to Supabase auth itself.

import React, { createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  schoolId: string | null;
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
  schoolId: string | null;
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  user,
  session,
  loading,
  schoolId,
  children,
}) => {
  return (
    <AuthContext.Provider value={{ user, session, loading, schoolId }}>
      {children}
    </AuthContext.Provider>
  );
};