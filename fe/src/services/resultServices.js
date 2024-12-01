import api from '../api';
  
  export const getAllResult = async (page = 1) => {
    try {
      const userToken = localStorage.getItem('userToken');
      const response = await api.get(`api/results/all?page=${page}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching results:', error);
      throw error;
    }
  };


  export const getResultById = async (id) => {
    try {
      const userToken = localStorage.getItem('userToken');
      const response = await api.get(`api/results/${id}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
      });
      return response.data.result;
    } catch (error) {
      console.error('Error checking registration status:', error);
      throw error;
    }
  };
