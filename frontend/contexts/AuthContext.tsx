'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authService, User, LoginData, RegisterData } from '@/lib/api/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Cache user data to avoid refetching on every navigation
const USER_CACHE_KEY = 'mkbl_user_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCachedUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(USER_CACHE_KEY);
    if (cached) {
      const { user, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return user;
      }
      // Cache expired, clean up
      localStorage.removeItem(USER_CACHE_KEY);
    }
  } catch (error) {
    console.warn('Failed to read user cache from localStorage:', error);
    // Attempt to clean up corrupted cache
    try {
      localStorage.removeItem(USER_CACHE_KEY);
    } catch {
      // Ignore cleanup errors
    }
  }
  return null;
}

function setCachedUser(user: User | null) {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify({ user, timestamp: Date.now() }));
    } else {
      localStorage.removeItem(USER_CACHE_KEY);
    }
  } catch (error) {
    console.warn('Failed to write user cache to localStorage:', error);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize with null to avoid hydration mismatch - cache is loaded in useEffect
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const fetchedRef = useRef(false);

  // Load cached user after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    const cachedUser = getCachedUser();
    if (cachedUser) {
      setUser(cachedUser);
      setLoading(false);
    }
  }, []);

  // Fetch current user on mount (but don't block if we have cache)
  useEffect(() => {
    if (!mounted || fetchedRef.current) return;
    fetchedRef.current = true;
    fetchUser();
  }, [mounted]);

  const fetchUser = async () => {
    // Only show loading if we don't have a cached user
    if (!user) setLoading(true);
    try {
      const userData = await authService.getMe();
      setUser(userData);
      setCachedUser(userData);
    } catch (error: any) {
      // User not authenticated - silently fail
      setUser(null);
      setCachedUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (data: LoginData) => {
    const userData = await authService.login(data);
    setUser(userData);
    setCachedUser(userData);
    // Redirect admins to admin dashboard, customers to their dashboard
    if (userData.userType === 'PRINTER_ADMIN') {
      router.push('/admin');
    } else {
      router.push('/dashboard');
    }
  };

  const register = async (data: RegisterData) => {
    const userData = await authService.register(data);
    setUser(userData);
    setCachedUser(userData);
    router.push('/dashboard');
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setCachedUser(null);
    router.push('/');
  };

  const refetch = async () => {
    await fetchUser();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
