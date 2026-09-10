import { createContext } from 'react';
import type { AuthenticatedUser } from '../services/ErpApiService';

export type AuthContextValue = {
  user: AuthenticatedUser | null;
  rights: Set<string>;
  permissions: string[];
  loading: boolean;
  error: string;
  refreshUser: () => Promise<void>;
  setAuthenticatedUser: (user: AuthenticatedUser | null) => void;
  clearAuthenticatedUser: () => void;
  hasRight: (rightName: string) => boolean;
  hasAnyRight: (rightNames: string[]) => boolean;
  hasAllRights: (rightNames: string[]) => boolean;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
