// Header.js
'use client';
import { useEffect } from 'react';
import { Navbar, NavbarContent, NavbarItem } from '@nextui-org/navbar';
import UserDropdown from './UserDropdown';
import { useAppStore } from '@/zustand/store';

export default function Header() {
  const { user, token, setToken, getToken } = useAppStore();
  console.log(user, token, "用户信息");
  useEffect(() => {
    const getUserToken = async () => {
      const token = await getToken();
      setToken(token);
    };

    if (user) {
      getUserToken();
    }
  }, [user]);

  return (
    <Navbar className="h-20 border-b-1 border-zinc-200">
      <div className="flex items-end">
        <span className="ml-2 flex items-end text-sm">
          与你的角色对话
        </span>
      </div>
      <NavbarContent justify="end" className="h-full flex items-center">
        <NavbarItem>
          {(!user || !token) ? (
            <span>去登录</span>
          ) : (
            <UserDropdown user={{
              displayName: user?.phone,
              accessToken: token,
              photoUrl: user?.imageUrl,
              email: user?.id,
            }} />
          )}
        </NavbarItem>
      </NavbarContent>
    </Navbar>
  );
}