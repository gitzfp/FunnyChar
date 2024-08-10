'use client'

import { NextUIProvider } from '@nextui-org/react';
import { ClerkProvider } from '@clerk/nextjs';
import { useEffect } from 'react';


export function Providers({ children }) {
  useEffect(()=>{
    document.documentElement.classList.remove('dark'); // 强制移除 dark 类
  }, [])
  return (
    <NextUIProvider>
      <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
        {children}
      </ClerkProvider>
    </NextUIProvider>
  )
}
