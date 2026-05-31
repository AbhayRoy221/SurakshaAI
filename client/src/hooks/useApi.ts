import { useAuth } from '../contexts/AuthContext';
import { useCallback } from 'react';

export function useApi() {
  const { token } = useAuth();

  const apiFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return res.json();
  }, [token]);

  return { apiFetch };
}
