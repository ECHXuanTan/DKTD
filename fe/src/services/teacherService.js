import api from '../api';

export const getTeacherByEmail = async () => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.get(`api/teachers/teacher/`, {
      headers: {
        'Content-type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching student:', error);
    throw error;
  }
};

export const getDepartmentTeachers = async () => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.get('api/teachers/department-teachers', {
      headers: {
        'Content-type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching department teachers:', error);
    throw error;
  }
};

export const createTeacher = async (teacherData) => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.post('api/teachers/create', teacherData, {
      headers: {
        'Content-type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error creating teacher:', error);
    throw error;
  }
};

export const updateTeacher = async (id, teacherData) => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.put(`api/teachers/update/${id}`, teacherData, {
      headers: {
        'Content-type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error updating teacher:', error);
    throw error;
  }
};

export const deleteTeacher = async (id) => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.delete(`api/teachers/delete/${id}`, {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting teacher:', error);
    throw error;
  }
};