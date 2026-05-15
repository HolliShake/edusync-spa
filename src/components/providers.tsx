import type { AuthDataDto } from '@/types';
import { AuthContext } from '@/context/auth.context';
import { Toaster } from '@/components/ui/sonner';
import React, { useState } from 'react';


type ProvidersProps = {
  children: React.ReactNode;
};

export default function Providers({ children }: ProvidersProps) {
  const [authData, setAuthData] = useState<AuthDataDto | null>(null);

  return <AuthContext.Provider value={{ authData, setAuthData }}>
    {children}
    <Toaster position="top-right" richColors closeButton />
  </AuthContext.Provider>;
}
    