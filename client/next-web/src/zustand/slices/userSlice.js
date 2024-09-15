import { getApiServerUrl } from '@/util/urlUtil';

const isClient = typeof window !== 'undefined';

export const createUserSlice = (set, get) => ({
  user: isClient ? localStorage.getItem('user') : null,
  token: isClient ? localStorage.getItem('token') : null,
  isAuthenticated: false,

  setUser: (userData) => {
    set({ user: userData, isAuthenticated: !!userData });
    if (isClient) {
      if (userData) {
        localStorage.setItem('user', JSON.stringify(userData));
      } else {
        localStorage.removeItem('user');
      }
    }
  },

  setToken: (newToken) => {
    const currentToken = get().token;
    if (currentToken !== newToken) {
      set({ token: newToken });
      if (isClient) {
        if (newToken) {
          localStorage.setItem('token', newToken);
        } else {
          localStorage.removeItem('token');
        }
      }
    }
  },

  login: async (credentials) => {
    try {
      const response = await fetch(`${getApiServerUrl()}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: credentials.phoneNumber,
          password: credentials.password
        }),
      });

      const data = await response.json();

      if (response.status === 200) {
        set({ 
          user: { id: data.userId, phone: credentials.phoneNumber },
          token: data.token, 
          isAuthenticated: true 
        });
        if (isClient) {
          localStorage.setItem('user', JSON.stringify({ id: data.userId, phone: credentials.phoneNumber }));
          localStorage.setItem('token', data.token);
        }
        return { success: true, message: data.message };
      } else if (response.status === 401) {
        return { success: false, message: data.detail || '密码错误' };
      } else if (response.status === 400) {
        return { success: false, message: data.detail || '请求错误' };
      } else {
        throw new Error(data.detail || '登录失败');
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: error.message || '服务器错误' };
    }
  },

  logout: () => {
    set({ user: null, token: null, isAuthenticated: false });
    if (isClient) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
  },

  getToken: () => get().token,

  initializeAuth: () => {
    if (isClient) {
      const storedUser = localStorage.getItem('user');
      const storedToken = localStorage.getItem('token');
      if (storedUser && storedToken) {
        set({
          user: JSON.parse(storedUser),
          isAuthenticated: true,
        });
      }
    }
  },

  updateUserProfile: async (updatedData) => {
    try {
      // 这里应该是实际的更新用户资料 API 调用
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${get().token}`,
        },
        body: JSON.stringify(updatedData),
      });
      const data = await response.json();
      if (response.ok) {
        set({ user: { ...get().user, ...data.user } });
        if (isClient) {
          localStorage.setItem('user', JSON.stringify({ ...get().user, ...data.user }));
        }
        return true;
      } else {
        throw new Error(data.message || 'Profile update failed');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      return false;
    }
  },

  signOut: () => {
    try {
      if (isClient) {
        // 清除本地存储
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }

      // 重置 store 状态
      set({
        user: null,
        token: null,
        isAuthenticated: false
      });

      console.log('User signed out successfully');
      return { result: true, error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { result: false, error: error.message };
    }
  },
});
