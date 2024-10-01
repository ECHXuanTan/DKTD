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
    const departmentsResponse = await api.get('api/departments/names', 
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userToken}`,
          },
        });
    const departments = departmentsResponse.data;

    const validatedTeachers = [];
    const invalidTeachers = [];

    for (const teacher of teachersData) {
      const validationResult = validateTeacherData(teacher);
      
      // Kiểm tra sự tồn tại của Tổ chuyên môn	
      const departmentObj = departments.find(dept => dept.name === teacher['Tổ chuyên môn']);
      if (!departmentObj) {
        validationResult.errors.push("Không tìm thấy Tổ chuyên môn");
      }

      if (validationResult.errors.length === 0) {
        validatedTeachers.push({
          name: teacher['Tên'],
          email: teacher['Email'],
          phone: teacher['Số điện thoại'],
          department: departmentObj._id,
          type: teacher['Loại giáo viên'],
          lessonsPerWeek: parseInt(teacher['Số tiết dạy một tuần']),
          teachingWeeks: parseInt(teacher['Số tuần dạy'])
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

const validateTeacherData = (teacher) => {
  const errors = [];
  
  if (!teacher['Tên']) errors.push("Tên là bắt buộc");
  if (!teacher['Email']) errors.push("Email là bắt buộc");
  if (!teacher['Số điện thoại']) errors.push("Số điện thoại là bắt buộc");
  if (!teacher['Tổ chuyên môn']) errors.push("Tổ chuyên môn là bắt buộc");
  if (!teacher['Loại giáo viên']) errors.push("Loại giáo viên là bắt buộc");
  if (!teacher['Số tiết dạy một tuần']) errors.push("Số tiết dạy một tuần là bắt buộc");
  if (!teacher['Số tuần dạy']) errors.push("Số tuần dạy là bắt buộc");

  // Kiểm tra định dạng email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (teacher['Email'] && !emailRegex.test(teacher['Email'])) {
    errors.push("Email không hợp lệ");
  }

  // Kiểm tra số điện thoại (giả sử số điện thoại Việt Nam)
  const phoneRegex = /^(0|\+84)(\s|\.)?((3[2-9])|(5[689])|(7[06-9])|(8[1-689])|(9[0-46-9]))(\d)(\s|\.)?(\d{3})(\s|\.)?(\d{3})$/;
  if (teacher['Số điện thoại'] && !phoneRegex.test(teacher['Số điện thoại'])) {
    errors.push("Số điện thoại không hợp lệ");
  }

  // Kiểm tra số tiết dạy một tuần và số tuần dạy
  if (isNaN(parseInt(teacher['Số tiết dạy một tuần'])) || parseInt(teacher['Số tiết dạy một tuần']) <= 0) {
    errors.push("Số tiết dạy một tuần phải là số nguyên dương");
  }
  if (isNaN(parseInt(teacher['Số tuần dạy'])) || parseInt(teacher['Số tuần dạy']) <= 0) {
    errors.push("Số tuần dạy phải là số nguyên dương");
  }

  return {
    name: teacher['Tên'] || 'Không xác định',
    errors: errors
  };
};