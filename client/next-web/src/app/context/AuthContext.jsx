'use client'

import React, { createContext, useState, useContext, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const AuthContext = createContext(null);

// 不需要认证的路径列表
const publicPaths = ['/login', '/register'];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 检查本地存储中是否有用户信息
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }else{
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading && !user && !publicPaths.includes(pathname)) {
      router.push('/login');
    }
  }, [user, loading, pathname, router]);

  const login = (email, password) => {
    // 实际登录逻辑
    console.log('登录:', email, password);
    const userData = { email };
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    router.push('/'); // 登录成功后重定向到首页
  };

  const register = (email, password) => {
    // 实际注册逻辑
    console.log('注册:', email, password);
    const userData = { email };
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    router.push('/'); // 注册成功后重定向到首页
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (loading) {
    return <div>Loading...</div>; // 或者一个加载指示器组件
  }

  if (!user && !publicPaths.includes(pathname)) {
    return null; // 或者一个空白页面，因为会很快重定向
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);