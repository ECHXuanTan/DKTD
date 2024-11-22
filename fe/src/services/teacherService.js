import api from '../api';

export const getAllTeachers = async () => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.get('api/teachers', {
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

export const getTeacherById = async (id) => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.get(`api/teachers/teacher/${id}`, {
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

export const getDepartmentTeacherNames = async () => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.get('api/teachers/department-teacher-names', {
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

export const createManyTeachers = async (teachersData) => {
  try {
    const userToken = localStorage.getItem('userToken');
    console.log("Dữ liệu giáo viên nhận được:", teachersData);

    // Validate department and subject IDs exist
    const [departmentsResponse, subjectsResponse] = await Promise.all([
      api.get('api/departments/names', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
      }),
      api.get('api/subjects', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
      }),
    ]);

    const departments = departmentsResponse.data;
    const subjects = subjectsResponse.data;

    const validatedTeachers = [];
    const invalidTeachers = [];

    for (const teacherData of teachersData) {
      const validationResult = validateTeacherData(teacherData, departments, subjects);

      if (validationResult.isValid) {
        // Process teacher data
        const processedTeacher = {
          name: teacherData.name,
          email: teacherData.email,
          phone: teacherData.phone || undefined,
          position: 'Giáo viên',
          department: teacherData.department,
          teachingSubjects: teacherData.teachingSubjects,
          type: teacherData.type,
          ...(teacherData.type === 'Cơ hữu' && {
            lessonsPerWeek: teacherData.lessonsPerWeek,
            teachingWeeks: teacherData.teachingWeeks,
            basicTeachingLessons: teacherData.lessonsPerWeek * teacherData.teachingWeeks,
            reductions: teacherData.reductions,
            totalReducedLessons: teacherData.totalReducedLessons
          })
        };

        validatedTeachers.push(processedTeacher);
      } else {
        invalidTeachers.push({
          name: teacherData.name || 'Unknown',
          errors: validationResult.errors
        });
      }
    }

    console.log("Giáo viên hợp lệ:", validatedTeachers);
    console.log("Giáo viên không hợp lệ:", invalidTeachers);

    if (validatedTeachers.length === 0) {
      throw new Error("Không có dữ liệu hợp lệ để tạo giáo viên");
    }

    const response = await api.post('api/teachers/create-many', 
      { teachers: validatedTeachers }, 
      {
        headers: {
          'Content-type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
      }
    );

    return {
      ...response.data,
      invalidTeachers
    };
  } catch (error) {
    console.error('Error creating multiple teachers:', error);
    throw error;
  }
};

const validateTeacherData = (teacherData, departments, subjects) => {
  const errors = [];

  // Validate required fields
  if (!teacherData.name || teacherData.name.trim() === '') {
    errors.push('Họ và tên là bắt buộc');
  }

  if (!teacherData.email || !/\S+@\S+\.\S+/.test(teacherData.email)) {
    errors.push('Email không hợp lệ');
  }

  if (teacherData.phone && !/^[0-9]{10}$/.test(teacherData.phone)) {
    errors.push('Số điện thoại không hợp lệ');
  }

  // Validate department
  if (!teacherData.department) {
    errors.push('Tổ chuyên môn là bắt buộc');
  } else {
    const departmentExists = departments.some(dept => dept._id === teacherData.department);
    if (!departmentExists) {
      errors.push('Không tìm thấy Tổ chuyên môn');
    }
  }

  // Validate teaching subjects
  if (!teacherData.teachingSubjects) {
    errors.push('Môn học giảng dạy là bắt buộc');
  } else {
    const subjectExists = subjects.some(subj => subj._id === teacherData.teachingSubjects);
    if (!subjectExists) {
      errors.push('Không tìm thấy Môn học giảng dạy');
    }
  }

  // Validate teacher type and related fields
  if (!teacherData.type || !['Cơ hữu', 'Thỉnh giảng'].includes(teacherData.type)) {
    errors.push('Hình thức giáo viên không hợp lệ');
  }

  if (teacherData.type === 'Cơ hữu') {
    // Validate teaching load
    if (!teacherData.lessonsPerWeek || teacherData.lessonsPerWeek <= 0) {
      errors.push('Số tiết dạy một tuần phải lớn hơn 0');
    }
    if (!teacherData.teachingWeeks || teacherData.teachingWeeks <= 0) {
      errors.push('Số tuần dạy phải lớn hơn 0');
    }

    // Validate reductions
    if (teacherData.reductions && Array.isArray(teacherData.reductions)) {
      teacherData.reductions.forEach((reduction, index) => {
        if (!reduction.reducedLessonsPerWeek || reduction.reducedLessonsPerWeek <= 0) {
          errors.push(`Số tiết giảm 1 tuần của giảm trừ ${index + 1} phải lớn hơn 0`);
        }
        if (!reduction.reducedWeeks || reduction.reducedWeeks <= 0) {
          errors.push(`Số tuần giảm của giảm trừ ${index + 1} phải lớn hơn 0`);
        }
        if (!reduction.reductionReason || reduction.reductionReason.trim() === '') {
          errors.push(`Nội dung giảm của giảm trừ ${index + 1} là bắt buộc`);
        }
        // Verify reducedLessons calculation
        if (reduction.reducedLessons !== reduction.reducedLessonsPerWeek * reduction.reducedWeeks) {
          errors.push(`Tổng số tiết giảm của giảm trừ ${index + 1} không chính xác`);
        }
      });

      // Verify total reduced lessons
      const calculatedTotal = teacherData.reductions.reduce((sum, reduction) => 
        sum + reduction.reducedLessons, 0
      );
      if (teacherData.totalReducedLessons !== calculatedTotal) {
        errors.push('Tổng số tiết giảm không khớp với chi tiết giảm trừ');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const getTeachersWithoutHomeroom = async () => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.get('api/teachers/without-homeroom', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching teachers without homeroom:', error);
    throw error;
  }
};

export const assignHomeroom = async (teacherId, classId, reducedLessonsPerWeek, reducedWeeks) => {
  try {
    const userToken = localStorage.getItem('userToken');
    const response = await api.post('api/teachers/assign-homeroom', 
      { teacherId, classId, reducedLessonsPerWeek, reducedWeeks },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error assigning homeroom:', error);
    throw error;
  }
};