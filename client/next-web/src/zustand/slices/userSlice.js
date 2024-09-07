import { getApiServerUrl } from '@/util/urlUtil';
export const createUserSlice = (set, get) => ({
  user: localStorage.getItem('user'),
  token: localStorage.getItem('token'),
  isAuthenticated: false,

  setUser: (userData) => {
    set({ user: userData, isAuthenticated: !!userData });
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
    } else {
      localStorage.removeItem('user');
    }
  },

  setToken: (newToken) => {
    const currentToken = get().token;
    if (currentToken !== newToken) {
      set({ token: newToken });
      if (newToken) {
        localStorage.setItem('token', newToken);
      } else {
        localStorage.removeItem('token');
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

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      const text = await response.text();
      console.log('Response text:', text);

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('Failed to parse response as JSON:', e);
        throw new Error('Server responded with invalid JSON');
      }

      if (response.ok) {
        set({ 
          user: { id: data.userId, phone: credentials.phoneNumber },
          token: data.token, 
          isAuthenticated: true 
        });
        console.log('Login success:', data);
        localStorage.setItem('user', JSON.stringify({ id: data.userId, phone: credentials.phoneNumber }));
        localStorage.setItem('token', data.token);
        return { success: true, message: data.message };
      } else {
        throw new Error(data.detail || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: error.message };
    }
  },

  logout: () => {
    set({ user: null, token: null, isAuthenticated: false });
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  },

  getToken: () => get().token,

  initializeAuth: () => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    if (storedUser && storedToken) {
      set({
        user: JSON.parse(storedUser),
        isAuthenticated: true,
      });
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
        localStorage.setItem('user', JSON.stringify({ ...get().user, ...data.user }));
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
      // 清除本地存储
      localStorage.removeItem('user');
      localStorage.removeItem('token');

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
