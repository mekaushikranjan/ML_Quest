'use client';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api';
import { useState } from 'react';

export const useAuth = () => {
  const router = useRouter();
  const { user, isAuthenticated, setAuth, clearAuth } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const register = async (data: {
    username: string;
    email: string;
    password: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.register(data);
      setAuth(res.data.data.user, res.data.data.tokens);
      router.push('/problems');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const login = async (data: { email: string; password: string }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.login(data);
      setAuth(res.data.data.user, res.data.data.tokens);
      router.push('/problems');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      const refreshToken = document.cookie
        .split('; ')
        .find(r => r.startsWith('refreshToken='))
        ?.split('=')[1];
      if (refreshToken) await authApi.logout(refreshToken);
    } finally {
      clearAuth();
      router.push('/auth/login');
    }
  };

  return { user, isAuthenticated, loading, error, register, login, logout };
};
