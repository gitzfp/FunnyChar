// app/providers.jsx
'use client'

import { NextUIProvider } from '@nextui-org/react';
import { ClerkProvider } from '@clerk/nextjs';


export function Providers({ children }) {
  return (
    <NextUIProvider>
      <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
        {children}
      </ClerkProvider>
    </NextUIProvider>
  )
}
