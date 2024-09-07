'use client'
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/zustand/store';


const Login = () => {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const {login} = useAppStore();

  const handlePhoneNumberChange = (e) => setPhoneNumber(e.target.value);
  const handlePasswordChange = (e) => setPassword(e.target.value);

  const handleLogin = async () => {
    // 手机号验证（简单的中国大陆手机号格式）
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      alert('请输入有效的手机号码');
      return;
    }

    // 密码长度检查
    if (password.length < 6) {
      alert('密码不能少于6位');
      return;
    }

    try {
      const result = await login({ phoneNumber, password });
      if (result.success) {
        router.push('/');
      } else {
        alert(result.message || '登录失败，请重试');
      }
    } catch (error) {
      console.error('登录出错:', error);
      alert('登录过程中出现错误，请重试');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-400 to-purple-500">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md transform transition-all hover:scale-105">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">欢迎登录</h1>
        <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
          <div className="mb-6">
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">手机号</label>
            <input
              type="tel"
              id="phoneNumber"
              value={phoneNumber}
              onChange={handlePhoneNumberChange}
              placeholder="请输入手机号"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">密码</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={handlePasswordChange}
              placeholder="请输入密码"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200 transform hover:scale-105"
          >
            登录 / 注册
          </button>
        </form>
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            首次登录的手机号将自动创建新账号
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;