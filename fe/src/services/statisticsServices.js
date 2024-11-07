import api from '../api';

export const getDepartmentTeachers = async () => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.get('api/statistics/department-teachers', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error getting department teachers:', error);
    throw error;
  }
};

export const getAllTeachers = async () => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.get('api/statistics/all-teachers', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error getting department teachers:', error);
    throw error;
  }
};

export const getBelowTeachers = async (department = null) => {
  try {
    const userToken = localStorage.getItem('userToken');
    let url = 'api/statistics/teachers-below-basic';
    if (department) {
      url += `?departmentId=${encodeURIComponent(department)}`;
    }
    const response = await api.get(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error getting teachers below basic:', error);
    throw error;
  }
};

export const getAboveTeachers = async (department = null) => {
  try {
    const userToken = localStorage.getItem('userToken');
    let url = 'api/statistics/teachers-above-threshold';
    if (department) {
      url += `?departmentId=${encodeURIComponent(department)}`;
    }
    const response = await api.get(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error getting teachers above threshold:', error);
    throw error;
  }
};

export const getAllClasses = async () => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.get('api/statistics/all-classes', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error getting department teachers:', error);
    throw error;
  }
};

export const getDepartmentClasses = async () => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.get('api/statistics/department-classes', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error getting department teachers:', error);
    throw error;
  }
};


export const getSubjectsAssignments = async () => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.get(`api/statistics/subject-statistics`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error getting teacher assignments:', error);
    throw error;
  }
};

export const getTeacherAssignments = async (teacherId) => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.get(`api/statistics/teacher-assignments/${teacherId}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error getting teacher assignments:', error);
    throw error;
  }
};

export const getClassData = async (classId) => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.get(`api/statistics/class/${classId}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error getting class data:', error);
    throw error;
  }
};

export const getSubjectStatistics = async (subjectId, grade = null) => {
  try {
    const userToken = localStorage.getItem('userToken');
    let url = `api/statistics/subject-statistics/${subjectId}`;
    if (grade !== null) {
      url += `?grade=${grade}`;
    }
    const response = await api.get(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error getting subject statistics:', error);
    throw error;
  }
};

export const getDepartmentStatistics = async (subjectId, grade = null) => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.get('api/statistics/department-statistics', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error getting department teachers:', error);
    throw error;
  }
};

export const getDepartmentTeachersById = async (departmentId) => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.get(`api/statistics/department-teachers/${departmentId}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error getting department teachers:', error);
    throw error;
  }
};

export const getAllTeachersAboveThreshold = async () => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.get('api/statistics/all-teachers-above-threshold', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error getting all teachers above threshold:', error);
    throw error;
  }
};

export const getAllTeachersBelowBasic = async () => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.get('api/statistics/all-teachers-below-basic', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error getting all teachers below basic:', error);
    throw error;
  }
};

export const getTeacherDetails = async () => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.get('api/statistics/teacher-details', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error getting teacher details:', error);
    throw error;
  }
};