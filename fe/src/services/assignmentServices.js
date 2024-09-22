import api from "../api";

export const getAllAssignmentTeachers = async (id) => {
    try {
      const userToken = localStorage.getItem('userToken');
      const response = await api.get(`api/assignment/teacher/${id}`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching all teachers:', error);
      throw error;
    }
  };

  export const getClassSubjectInfo = async (classId, subjectId) => {
    try {
      const userToken = localStorage.getItem('userToken');
      const response = await api.get(`api/assignment/class-subject-info/${classId}/${subjectId}`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching class subject info:', error);
      throw error;
    }
  };

  export const createAssignment = async (classId, subjectId, teacherId, lessons) => {
    try {
      const userToken = localStorage.getItem('userToken');
      const response = await api.post('api/assignment/assign', 
        {
          classId,
          subjectId,
          assignments: [{ teacherId, lessons }]
        },
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error creating assignment:', error);
      throw error;
    }
  };

  export const editAssignment = async (assignmentId, newLessons) => {
    try {
      const userToken = localStorage.getItem('userToken');
      const response = await api.put('api/assignment/edit', 
        {
          assignmentId,
          newLessons
        },
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error editing assignment:', error);
      throw error;
    }
  };
  
  export const deleteAssignment = async (assignmentId) => {
    try {
      const userToken = localStorage.getItem('userToken');
      const response = await api.delete('api/assignment/delete', 
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
          data: {
            assignmentId
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error deleting assignment:', error);
      throw error;
    }
  };

  export const getAssignmentsBySubject = async (subjectId) => {
    try {
      const userToken = localStorage.getItem('userToken');
      const response = await api.get(`/api/assignment/by-subject/${subjectId}`,
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching assignments by subject:', error);
      throw error;
    }
  };
  