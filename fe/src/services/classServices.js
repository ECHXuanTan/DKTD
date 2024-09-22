import api from '../api';

export const getClasses = async () => {
    try {
      const userToken = localStorage.getItem('userToken');
      const response = await api.get('api/class/classes', 
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

export const getClassById = async (classId) => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.get(`api/class/${classId}`, 
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching class:', error);
    throw error;
  }
};

export const createClass = async (classData) => {
    try {
        const userToken = localStorage.getItem('userToken');
        const response = await api.post('api/class/create-class', classData, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${userToken}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error creating class:', error);
        throw error;
    }
};

export const createClasses = async (classesData) => {
  try {
      const userToken = localStorage.getItem('userToken');
      const response = await api.post('api/class/create-classes', { classes: classesData }, {
          headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${userToken}`,
          },
      });
      return response.data;
  } catch (error) {
      console.error('Error creating multiple classes:', error);
      throw error;
  }
};

export const updateSubjectLessonCount = async (classId, subjectId, lessonCount) => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.put(`api/class/${classId}/update-subject/${subjectId}`, { lessonCount }, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error updating subject lesson count:', error);
    throw error;
  }
};

export const removeSubjectFromClass = async (classId, subjectId) => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.delete(`api/class/${classId}/remove-subject/${subjectId}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error removing subject from class:', error);
    throw error;
  }
};

export const addSubjectToClass = async (classId, subjectId, lessonCount) => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.post(`api/class/${classId}/add-subject`, 
      { subjectId, lessonCount },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error adding subject to class:', error);
    throw error;
  }
};

export const getClassByDepartment = async (departmentId) => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.get(`api/class/department-classes/${departmentId}`, 
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error adding subject to class:', error);
    throw error;
  }
};

export const deleteClass = async (classId) => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.delete(`api/class/${classId}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting class:', error);
    throw error;
  }
};