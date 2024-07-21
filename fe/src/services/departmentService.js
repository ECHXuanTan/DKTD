import api from '../api';

export const getDepartmentNames = async () => {
    try {
      const userToken = localStorage.getItem('userToken');
      const response = await api.get('api/departments/names', 
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

export const getAllDepartment = async () => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.get('api/departments/all', 
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

export const updateDepartmentAssignmentTime = async (departmentId, totalAssignmentTime, salaryPrice) => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.put(
      `api/departments/${departmentId}/update-assignment-time`,
      { totalAssignmentTime, salaryPrice },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating department assignment time:', error);
    throw error;
  }
};