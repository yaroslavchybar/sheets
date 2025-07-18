"use client";

import type { User } from '@/lib/types';
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { sheetUsers } from '@/data/sheet-data';
import { useToast } from './use-toast';

interface AuthContextType {
  user: User | null;
  login: (email: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();

  const login = (email: string) => {
    // In a real app, this would involve a call to an authentication service
    // or Google Sheets API. For this demo, we check against our mock user list.
    const foundUser = sheetUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (foundUser) {
      setUser(foundUser);
      return true;
    } else {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "No user found with that email address.",
      })
      return false;
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
