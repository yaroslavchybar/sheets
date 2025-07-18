"use client";

import type { User } from '@/lib/types';
import React, { createContext, useState, useContext, ReactNode } from 'react';

interface AuthContextType {
  user: User | null;
  login: (role: 'admin' | 'member') => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const adminUser: User = {
  name: 'Admin User',
  email: 'admin@sheetflow.app',
  avatar: 'https://placehold.co/40x40/212529/F8F9FA/png?text=AU',
  role: 'admin',
};

const memberUser: User = {
    name: 'Alice',
    email: 'alice@sheetflow.app',
    avatar: 'https://placehold.co/40x40/212529/F8F9FA/png?text=A',
    role: 'member',
};


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = (role: 'admin' | 'member') => {
    if (role === 'admin') {
      setUser(adminUser);
    } else {
      setUser(memberUser);
    }
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
