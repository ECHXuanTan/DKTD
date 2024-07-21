import api from '../api';

export const createResult = async (subjects) => {
    try {
      const userToken = localStorage.getItem('userToken');
      const response = await api.post('api/results/register-subjects', 
        { subjects },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userToken}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error creating result:', error);
      throw error;
    }
  };


  export const checkRegistrationStatus = async () => {
    try {
      const userToken = localStorage.getItem('userToken');
      const response = await api.get('api/results/check-registration', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error checking registration status:', error);
      throw error;
    }
  };

  export const getResultByStudent = async () => {
    try {
      const userToken = localStorage.getItem('userToken');
      const response = await api.get('api/results/student', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error checking registration status:', error);
      throw error;
    }
  };

  export const getAllResult = async () => {
    try {
      const userToken = localStorage.getItem('userToken');
      const response = await api.get('api/results/all', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error checking registration status:', error);
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

  export const deleteResultById = async (id) => {
    try {
      const userToken = localStorage.getItem('userToken');
      const response = await api.delete(`api/results/${id}`, {
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