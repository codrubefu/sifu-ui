import type React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { erpApiService } from '../services/ErpApiService';
import { useTranslation } from 'react-i18next';

type ProtectedRouteProps = {
  requiredRights?: string[];
  requireAll?: boolean;
  children: React.ReactNode;
};

export function ProtectedRoute({ requiredRights = [], requireAll = false, children }: ProtectedRouteProps) {
  const location = useLocation();
  const { t } = useTranslation();
  const { user, loading, error, hasAnyRight, hasAllRights } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-slate-50 p-8 text-sm text-slate-600">{t('common.loading')}</div>;
  }

  if (error) {
    return <div className="min-h-screen bg-slate-50 p-8 text-sm font-semibold text-red-700">{error.includes('.') ? t(error) : error}</div>;
  }

  if (!user || !erpApiService.getToken()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const allowed = requiredRights.length === 0 || (requireAll ? hasAllRights(requiredRights) : hasAnyRight(requiredRights));
  if (!allowed) return <Navigate to="/unauthorized" replace state={{ from: location.pathname }} />;

  return <>{children}</>;
}
