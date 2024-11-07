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

    // Lấy danh sách khoa từ server
    const departmentsResponse = await api.get('api/departments/names', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
    });
    const departments = departmentsResponse.data;

    // Lấy danh sách môn học từ server
    const subjectsResponse = await api.get('api/subjects', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
    });
    const subjects = subjectsResponse.data;

    const validatedTeachers = [];
    const invalidTeachers = [];

    for (const teacherData of teachersData) {
      const validationResult = validateTeacherData(teacherData);
      
      // Kiểm tra sự tồn tại của Tổ chuyên môn
      const departmentObj = departments.find(dept => dept.name === teacherData['Tổ chuyên môn']);
      if (!departmentObj) {
        validationResult.errors.push("Không tìm thấy Tổ chuyên môn");
      }

      // Kiểm tra sự tồn tại của Môn học giảng dạy
      const subjectObj = subjects.find(subj => subj.name === teacherData['Môn học giảng dạy']);
      if (!subjectObj) {
        validationResult.errors.push("Không tìm thấy Môn học giảng dạy");
      }

      if (validationResult.errors.length === 0) {
        validatedTeachers.push({
          name: teacherData['Tên'] || teacherData['Họ và tên'],
          email: teacherData['Email'],
          phone: teacherData['Số điện thoại'] || undefined, // Chỉ thêm nếu có
          department: departmentObj._id,
          teachingSubjects: subjectObj._id,
          type: teacherData['Hình thức giáo viên'],
          lessonsPerWeek: teacherData['Hình thức giáo viên'] === 'Cơ hữu' ? parseInt(teacherData['Số tiết dạy một tuần']) : 0,
          teachingWeeks: teacherData['Hình thức giáo viên'] === 'Cơ hữu' ? parseInt(teacherData['Số tuần dạy']) : 0,
          reducedLessonsPerWeek: teacherData['Hình thức giáo viên'] === 'Cơ hữu' ? parseInt(teacherData['Số tiết giảm 1 tuần'] || 0) : 0,
          reducedWeeks: teacherData['Hình thức giáo viên'] === 'Cơ hữu' ? parseInt(teacherData['Số tuần giảm'] || 0) : 0,
          reductionReason: teacherData['Hình thức giáo viên'] === 'Cơ hữu' ? teacherData['Nội dung giảm'] : ''
        });
      } else {
        invalidTeachers.push({ name: validationResult.name, errors: validationResult.errors });
      }
    }

    console.log("Giáo viên hợp lệ:", validatedTeachers);
    console.log("Giáo viên không hợp lệ:", invalidTeachers);

    if (validatedTeachers.length === 0) {
      console.error("Không có dữ liệu hợp lệ để tạo giáo viên");
      throw new Error("Không có dữ liệu hợp lệ để tạo giáo viên");
    }

    console.log("Đang gửi yêu cầu tạo giáo viên đến server");
    const response = await api.post('api/teachers/create-many', { teachers: validatedTeachers }, {
      headers: {
        'Content-type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
    });

    console.log("Phản hồi từ server:", response.data);

    return {
      ...response.data,
      invalidTeachers
    };
  } catch (error) {
    console.error('Error creating multiple teachers:', error);
    throw error;
  }
};

const validateTeacherData = (teacherData) => {
  const errors = [];
  const name = teacherData['Tên'] || teacherData['Họ và tên'];

  if (!name || name.trim() === '') {
    errors.push('Tên là bắt buộc');
  }

  if (!teacherData['Email'] || !/\S+@\S+\.\S+/.test(teacherData['Email'])) {
    errors.push('Email không hợp lệ');
  }

  if (teacherData['Số điện thoại'] && !/^[0-9]{10}$/.test(teacherData['Số điện thoại'])) {
    errors.push('Số điện thoại không hợp lệ');
  }

  if (!teacherData['Tổ chuyên môn'] || teacherData['Tổ chuyên môn'].trim() === '') {
    errors.push('Tổ chuyên môn là bắt buộc');
  }

  if (!teacherData['Môn học giảng dạy'] || teacherData['Môn học giảng dạy'].trim() === '') {
    errors.push('Môn học giảng dạy là bắt buộc');
  }

  if (!teacherData['Hình thức giáo viên'] || !['Cơ hữu', 'Thỉnh giảng'].includes(teacherData['Hình thức giáo viên'])) {
    errors.push('Hình thức giáo viên không hợp lệ');
  }

  if (teacherData['Hình thức giáo viên'] === 'Cơ hữu') {
    if (!teacherData['Số tiết dạy một tuần'] || isNaN(teacherData['Số tiết dạy một tuần'])) {
      errors.push('Số tiết dạy một tuần là bắt buộc cho giáo viên cơ hữu');
    }
    if (!teacherData['Số tuần dạy'] || isNaN(teacherData['Số tuần dạy'])) {
      errors.push('Số tuần dạy là bắt buộc cho giáo viên cơ hữu');
    }
  }

  return { name, errors };
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