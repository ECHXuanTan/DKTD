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

export const getSubjectsByDepartment = async (departmentId) => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.get(`api/subjects/department/${departmentId}`, {
      headers: {
        'Content-type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching subjects by department:', error);
    throw error;
  }
};

export const getNonSpecializedSubjects = async () => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.get(`api/subjects/non-specialized`, {
      headers: {
        'Content-type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching non-specialized subjects:', error);
    throw error;
  }
};