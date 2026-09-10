import React, { useCallback, useMemo, useState } from 'react';
import { ApiClientError } from '../api/apiClient';
import { getAuthenticatedUser } from '../api/authApi';
import { erpApiService, type AuthenticatedUser } from '../services/ErpApiService';
import { extractUserRights, hasAllRights as hasAllRightsHelper, hasAnyRight as hasAnyRightHelper, hasRight as hasRightHelper } from '../permissions/permissions';
import { AuthContext, type AuthContextValue } from './authContextValue';

const AUTH_USER_KEY = 'master-erp-auth-user';

function loadStoredUser() {
  try {
    const raw = window.localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) as AuthenticatedUser : null;
  } catch {
    return null;
  }
}

function saveStoredUser(user: AuthenticatedUser | null) {
  if (!user) {
    window.localStorage.removeItem(AUTH_USER_KEY);
    return;
  }
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(() => loadStoredUser());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const rights = useMemo(() => extractUserRights(user as Parameters<typeof extractUserRights>[0]), [user]);
  const permissions = useMemo(() => Array.from(rights).sort(), [rights]);

  const refreshUser = useCallback(async () => {
    if (!erpApiService.getToken()) {
      setUser(null);
      saveStoredUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const currentUser = await getAuthenticatedUser();
      setUser(currentUser);
      saveStoredUser(currentUser);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        setUser(null);
        saveStoredUser(null);
        return;
      }
      if (err instanceof ApiClientError && err.status === 403) {
        setError('common.unauthorized');
        return;
      }
      setError(err instanceof Error ? err.message : 'auth.loadUserError');
    } finally {
      setLoading(false);
    }
  }, []);

  const setAuthenticatedUser = useCallback((nextUser: AuthenticatedUser | null) => {
    setUser(nextUser);
    saveStoredUser(nextUser);
  }, []);

  const clearAuthenticatedUser = useCallback(() => {
    setUser(null);
    saveStoredUser(null);
    setError('');
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    rights,
    permissions,
    loading,
    error,
    refreshUser,
    setAuthenticatedUser,
    clearAuthenticatedUser,
    hasRight: (rightName) => hasRightHelper(rights, rightName),
    hasAnyRight: (rightNames) => hasAnyRightHelper(rights, rightNames),
    hasAllRights: (rightNames) => hasAllRightsHelper(rights, rightNames),
  }), [clearAuthenticatedUser, error, loading, permissions, refreshUser, rights, setAuthenticatedUser, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
