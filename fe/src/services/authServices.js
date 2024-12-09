import api from '../api';

export const logout = async () => {
  localStorage.removeItem('userToken')
  await api.get('/api/auth/logout');
  window.location.href = '/';
};

export const getUser = async () => {
  try {
    const userToken = localStorage.getItem('userToken');
      const response = await api.get(`api/users/profile`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
      });
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      throw new Error('Bạn phải sử dụng Email do nhà trường cung cấp');
    } else {
      throw new Error('Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại.');
    }
  }
};

export const authService = {
  googleLogin: async (data) => {
    try {
      const response = await api.post('/api/auth/google-login', data);
      if (response.data.success && response.data.token) {
        localStorage.setItem('userToken', response.data.token);
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};
