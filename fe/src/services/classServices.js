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
      // Transform the data to include calculated lessonCount
      const transformedData = {
          ...classData,
          subjects: classData.subjects.map(subject => ({
              subjectId: subject.subjectId,
              periodsPerWeek: parseInt(subject.periodsPerWeek),
              numberOfWeeks: parseInt(subject.numberOfWeeks),
              lessonCount: parseInt(subject.lessonCount)
          }))
      };
      
      const response = await api.post('api/class/create-class', transformedData, {
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
      // Remove the redundant transformation since data is already formatted
      const response = await api.post('api/class/create-classes', 
          { classes: classesData }, // Send formatted data directly
          {
              headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${userToken}`,
              },
          }
      );
      return response.data;
  } catch (error) {
      console.error('Error creating multiple classes:', error);
      throw error;
  }
};

export const updateSubjectLessonCount = async (classId, subjectId, periodsPerWeek, numberOfWeeks) => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.put(
      `api/class/${classId}/update-subject/${subjectId}`, 
      { 
        periodsPerWeek: parseInt(periodsPerWeek), 
        numberOfWeeks: parseInt(numberOfWeeks) 
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating subject:', error);
    throw error;
  }
};

export const addSubjectToClass = async (classId, subjectId, periodsPerWeek, numberOfWeeks) => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.post(
      `api/class/${classId}/add-subject`,
      {
        subjectId,
        periodsPerWeek: parseInt(periodsPerWeek),
        numberOfWeeks: parseInt(numberOfWeeks)
      },
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

export const getClassesBySubject = async (subjectId) => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.get(`api/class/by-subject/${subjectId}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching classes by subject:', error);
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

export const addSubjectsToClasses = async (classSubjectsData) => {
  try {
      const userToken = localStorage.getItem('userToken');
      
      // Gửi dữ liệu trực tiếp lên API mà không cần transform
      const response = await api.post(
          'api/class/add-subjects-to-classes', 
          classSubjectsData,  // Đã được format từ modal
          {
              headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${userToken}`,
              },
          }
      );
      return response.data;
  } catch (error) {
      console.error('Error adding subjects to classes:', error);
      throw error;
  }
};

export const getUnassignedHomerooms = async () => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.get('api/class/classes-without-homeroom', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching unassigned homerooms:', error);
    throw error;
  }
};