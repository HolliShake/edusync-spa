import type { AuthDataDto } from '@/types';
import { createContext, useContext } from 'react';
import type { Dispatch, SetStateAction } from 'react';

export type AuthContextValue = {
  authData: AuthDataDto | null;
  setAuthData: Dispatch<SetStateAction<AuthDataDto | null>>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within Providers');
  }
  return context;
};
