'use client'

import React from 'react';
export function NextAuthProvider({children}: { children: React.ReactNode }) {
  // Dynamically import SessionProvider on client to avoid SSR vendor-chunks requirement
  const [SP, setSP] = React.useState<any>(null);
  React.useEffect(() => {
    import('next-auth/react').then(mod => {
      setSP(() => mod.SessionProvider);
    }).catch(() => {
      setSP(() => null);
    });
  }, []);
  if (!SP) return <>{children}</>;
  const SessionProvider = SP;
  return <SessionProvider>{children}</SessionProvider>;
}
