// app/providers.jsx
'use client'

import { NextUIProvider } from '@nextui-org/react';
import { AuthContextProvider } from '@/context/AuthContext';
import { ClerkProvider } from '@clerk/nextjs';


export function Providers({ children }) {
  return (
    <NextUIProvider>
      {/* <AuthContextProvider> */}
      <ClerkProvider>
        {children}
      {/* </AuthContextProvider> */}
      </ClerkProvider>
    </NextUIProvider>
  )
}
