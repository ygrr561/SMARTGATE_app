import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole } from '../types/index.js';
import { api } from '../services/api.js';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  token: string | null;
  switchUser: (userId: string) => Promise<void>;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => void;
  availableDemoUsers: User[];
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USERS: User[] = [
  {
    id: 'usr-res-1',
    name: 'Rahul Sharma',
    email: 'rahul.sharma@example.com',
    phone: '+91 98450 12345',
    role: 'RESIDENT',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    flatNumber: 'A-402',
    floor: 4,
    wing: 'Wing A',
    isActive: true,
  },
  {
    id: 'usr-guard-1',
    name: 'Vikram Singh',
    email: 'guard1@smartgate.local',
    phone: '+91 91234 56789',
    role: 'GUARD',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    guardGate: 'Gate 1 - Main Gate',
    isActive: true,
  },
  {
    id: 'usr-admin-1',
    name: 'Col. R. K. Nair',
    email: 'admin@smartgate.local',
    phone: '+91 98201 11223',
    role: 'ADMIN',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    flatNumber: 'A-601',
    floor: 6,
    wing: 'Wing A',
    isActive: true,
  },
  {
    id: 'usr-res-2',
    name: 'Priya Patel',
    email: 'priya.patel@example.com',
    phone: '+91 98765 43210',
    role: 'RESIDENT',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    flatNumber: 'B-201',
    floor: 2,
    wing: 'Wing B',
    isActive: true,
  }
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(() => {
    const saved = localStorage.getItem('smartgate_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return DEMO_USERS[0]; // Default to Resident Rahul Sharma
  });

  const [token, setToken] = useState<string | null>(() => localStorage.getItem('smartgate_token') || 'demo-jwt-token');

  useEffect(() => {
    if (user) {
      localStorage.setItem('smartgate_user', JSON.stringify(user));
    }
  }, [user]);

  const switchUser = async (userId: string) => {
    try {
      const res = await api.login({ roleSwitchUserId: userId });
      setUser(res.user);
      setToken(res.token);
      localStorage.setItem('smartgate_user', JSON.stringify(res.user));
      localStorage.setItem('smartgate_token', res.token);
    } catch (err) {
      console.warn('Switch user API error, using local fallback:', err);
      const found = DEMO_USERS.find(u => u.id === userId);
      if (found) {
        setUser(found);
        localStorage.setItem('smartgate_user', JSON.stringify(found));
      }
    }
  };

  const login = async (email: string, password?: string) => {
    try {
      const res = await api.login({ email, password });
      setUser(res.user);
      setToken(res.token);
      localStorage.setItem('smartgate_user', JSON.stringify(res.user));
      localStorage.setItem('smartgate_token', res.token);
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  };

  const logout = () => {
    setUser(DEMO_USERS[0]);
    localStorage.removeItem('smartgate_user');
    localStorage.removeItem('smartgate_token');
  };

  const refreshUser = async () => {
    if (!user?.id) return;
    try {
      const res = await api.getMe(user.id);
      if (res.user) setUser(res.user);
    } catch (e) {
      console.warn('Could not refresh user', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user.role,
        token,
        switchUser,
        login,
        logout,
        availableDemoUsers: DEMO_USERS,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
