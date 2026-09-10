import type React from 'react';
import { useAuth } from '../context/useAuth';

type CanProps = {
  anyOf?: string[];
  allOf?: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
};

export function Can({ anyOf, allOf, fallback = null, children }: CanProps) {
  const { hasAnyRight, hasAllRights } = useAuth();
  const allowedByAny = anyOf ? hasAnyRight(anyOf) : true;
  const allowedByAll = allOf ? hasAllRights(allOf) : true;
  return allowedByAny && allowedByAll ? <>{children}</> : <>{fallback}</>;
}
