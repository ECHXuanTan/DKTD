import api from '../api';

export const deleteHomeroom = async (teacherId) => {
    try {
    const userToken = localStorage.getItem('userToken');
      const response = await api.delete(`/api/homerooms/teacher/${teacherId}`,
        {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${userToken}`,
            },
          }
      );
      return response.data;
    } catch (error) {
      throw error.response.data;
    }
  };