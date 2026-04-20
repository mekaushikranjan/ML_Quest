'use client';

import { useEffect } from 'react';
import Cookies from 'js-cookie';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

/**
 * On app load: if we have an access token, call /auth/me to restore or sync user.
 * Handles session restore (e.g. after refresh) and keeps user in sync with backend.
 */
export function AuthHydration() {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    const token = Cookies.get('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    authApi
      .me()
      .then((res) => {
        if (!cancelled && res.data?.data?.user) {
          setUser(res.data.data.user);
        }
      })
      .catch(() => {
        // 401 will be handled by api interceptor (refresh or redirect)
        if (!cancelled) setLoading(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [setUser, setLoading]);

  return null;
}
