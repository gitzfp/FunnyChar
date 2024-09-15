'use client'
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/zustand/store';
import { Input, Button, Card, CardBody, CardHeader} from "@nextui-org/react";
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/solid';
import toast, { Toaster } from 'react-hot-toast';

const Login = () => {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const { login } = useAppStore();

  const toggleVisibility = () => setIsVisible(!isVisible);

  const handleLogin = async () => {
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      toast.error('请输入有效的手机号码');
      return;
    }

    if (password.length < 6) {
      toast.error('密码不能少于6位');
      return;
    }

    try {
      const result = await login({ phoneNumber, password });
      if (result.success) {
        toast.success('登录成功');
        router.push('/');
      } else {
        toast.error(result.message || '登录失败，请重试');
      }
    } catch (error) {
      console.error('登录出错:', error);
      toast.error('登录过程中出现错误，请重试');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-100 to-purple-100">
      <Toaster position="top-center" reverseOrder={false} />
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="flex flex-col items-center pb-0 pt-6">
          <h1 className="text-3xl font-bold text-center text-gray-800">欢迎登录</h1>
        </CardHeader>
        <CardBody className="px-8 py-6">
          <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
            <Input
              type="tel"
              label="手机号"
              placeholder="请输入手机号"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="mb-4"
              required
            />
            <Input
              label="密码"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              endContent={
                <button className="focus:outline-none" type="button" onClick={toggleVisibility}>
                  {isVisible ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              }
              type={isVisible ? "text" : "password"}
              className="mb-6"
              required
            />
            <Button
              color="primary"
              type="submit"
              className="w-full"
            >
              登录 / 注册
            </Button>
          </form>
          <h2 className="text-center text-xs text-gray-400 mt-6">
            首次登录的手机号将自动创建新账号
          </h2>
        </CardBody>
      </Card>
    </div>
  );
};

export default Login;