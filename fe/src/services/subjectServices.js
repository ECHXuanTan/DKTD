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

export const createSubject = async (subjectData) => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.post('api/subjects/create', subjectData, {
      headers: {
        'Content-type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error creating subject:', error);
    throw error;
  }
};

export const updateSubject = async (subjectId, updateData) => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.put(`api/subjects/${subjectId}`, updateData, {
      headers: {
        'Content-type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error updating subject:', error);
    throw error;
  }
};

export const deleteSubject = async (subjectId) => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.delete(`api/subjects/${subjectId}`, {
      headers: {
        'Content-type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting subject:', error);
    throw error;
  }
};