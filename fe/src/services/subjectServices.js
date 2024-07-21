import api from '../api';

export const getSubject = async () => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.get(`api/subjects/`, {
      headers: {
        'Content-type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching subject:', error);
    throw error;
  }
};
