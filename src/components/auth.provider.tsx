import type { AuthDataDto } from '@/types';
import { AuthContext } from '@/context/auth.context';
import React, { useState } from 'react';


type AuthProviderProps = {
  children: React.ReactNode;
};

export default function AuthProvider({ children }: AuthProviderProps) {
  const [authData, setAuthData] = useState<AuthDataDto | null>(null);
  return (
    <AuthContext.Provider value={{ authData, setAuthData }}>
        {children}
    </AuthContext.Provider>
  );
}
    