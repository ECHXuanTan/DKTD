import express from 'express';
import Teacher from '../models/teacherModel.js';
import Department from '../models/departmentModel.js';
import TeacherAssignment from '../models/teacherAssignmentModels.js';
import Subject from '../models/subjectModels.js';
import Class from '../models/classModels.js';
import Result from '../models/resultModel.js';
import Homeroom from '../models/homeroomModel.js';
import { isAuth, isAdmin } from '../utils.js'; 

const teacherRoutes = express.Router();

// Hàm tiện ích để lấy họ từ chuỗi họ và tên đầy đủ
const getFirstName = (fullName) => {
  const nameParts = fullName.trim().split(' ');
  return nameParts[0];
};

// Hàm tiện ích để lấy tên từ chuỗi họ và tên đầy đủ
const getLastName = (fullName) => {
  const nameParts = fullName.trim().split(' ');
  return nameParts[nameParts.length - 1];
};

// Hàm tiện ích để lấy tên đệm từ chuỗi họ và tên đầy đủ
const getMiddleName = (fullName) => {
  const nameParts = fullName.trim().split(' ');
  return nameParts.slice(1, -1).join(' ');
};

// Hàm so sánh hai chuỗi tiếng Việt có dấu
const compareVietnameseStrings = (a, b) => {
  return a.localeCompare(b, 'vi', { sensitivity: 'base' });
};

// Hàm sắp xếp giáo viên theo tên
const sortTeachersByName = (teachers) => {
  return teachers.sort((a, b) => {
    const lastNameA = getLastName(a.name);
    const lastNameB = getLastName(b.name);
    const lastNameComparison = compareVietnameseStrings(lastNameA, lastNameB);
    
    if (lastNameComparison !== 0) {
      return lastNameComparison;
    }
    
    const middleNameA = getMiddleName(a.name);
    const middleNameB = getMiddleName(b.name);
    const middleNameComparison = compareVietnameseStrings(middleNameA, middleNameB);
    
    if (middleNameComparison !== 0) {
      return middleNameComparison;
    }
    
    const firstNameA = getFirstName(a.name);
    const firstNameB = getFirstName(b.name);
    return compareVietnameseStrings(firstNameA, firstNameB);
  });
};

teacherRoutes.get('/without-homeroom', isAuth, async (req, res) => {
  try {
    // First, get all teachers
    let allTeachers = await Teacher.find()
      .select('_id name department teachingSubjects')
      .populate('department', 'name')
      .populate('teachingSubjects', 'name')
      .lean();

    // Get all teachers who have homeroom assignments
    const teachersWithHomeroom = await Homeroom.distinct('teacher');

    // Filter out teachers who have homeroom assignments
    let teachersWithoutHomeroom = allTeachers.filter(teacher => 
      !teachersWithHomeroom.some(id => id.equals(teacher._id))
    );

    // Sort the filtered teachers
    teachersWithoutHomeroom = sortTeachersByName(teachersWithoutHomeroom);

    res.status(200).json(teachersWithoutHomeroom);
  } catch (error) {
    console.error('Error fetching teachers without homeroom:', error);
    res.status(500).json({ message: "Lỗi khi lấy danh sách giáo viên chưa được chỉ định chủ nhiệm", error: error.message });
  }
});

teacherRoutes.get('/teacher', isAuth, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const teacher = await Teacher.findOne({ email: userEmail })
      .populate('department', 'name')
      .populate('teachingSubjects', 'name');

    if (!teacher) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin giáo viên' });
    }

    const homeroom = await Homeroom.findOne({ teacher: teacher._id })
      .populate('class', 'name grade');

    const teacherWithHomeroom = {
      ...teacher.toObject(),
      homeroom: homeroom ? {
        class: homeroom.class.name,
        grade: homeroom.class.grade,
        reducedLessonsPerWeek: homeroom.reducedLessonsPerWeek,
        reducedWeeks: homeroom.reducedWeeks,
        totalReducedLessons: homeroom.totalReducedLessons
      } : null
    };

    res.json(teacherWithHomeroom);
  } catch (error) {
    console.error('Error fetching teacher:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy thông tin giáo viên' });
  }
});

teacherRoutes.get('/department-teachers', isAuth, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const currentTeacher = await Teacher.findOne({ email: userEmail });

    if (!currentTeacher) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin giáo viên' });
    }

    let departmentTeachers = await Teacher.find({ department: currentTeacher.department._id })
      .populate('department', 'id name totalAssignmentTime declaredTeachingLessons')
      .populate('teachingSubjects', 'name')
      .lean();

    departmentTeachers = sortTeachersByName(departmentTeachers);

    const teachersWithAssignments = await Promise.all(departmentTeachers.map(async (teacher) => {
      const assignments = await TeacherAssignment.find({ teacher: teacher._id })
        .populate('class', 'name')
        .populate('subject', 'name');

      const homeroom = await Homeroom.findOne({ teacher: teacher._id })
        .populate('class', 'name grade');

      return {
        ...teacher,
        assignments: assignments.map(assignment => ({
          class: assignment.class.name,
          subject: assignment.subject.name,
          completedLessons: assignment.completedLessons
        })),
        homeroom: homeroom ? {
          class: homeroom.class.name,
          grade: homeroom.class.grade,
          reducedLessonsPerWeek: homeroom.reducedLessonsPerWeek,
          reducedWeeks: homeroom.reducedWeeks,
          totalReducedLessons: homeroom.totalReducedLessons
        } : null
      };
    }));

    res.json({
      success: true,
      data: teachersWithAssignments
    });

  } catch (error) {
    console.error('Error fetching department teachers:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách giáo viên trong tổ bộ môn' });
  }
});

teacherRoutes.get('/department-teacher-names', isAuth, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const currentTeacher = await Teacher.findOne({ email: userEmail });

    if (!currentTeacher) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin giáo viên' });
    }

    let departmentTeachers = await Teacher.find({ department: currentTeacher.department._id }).select('name').lean();
    departmentTeachers = sortTeachersByName(departmentTeachers);

    res.json({
      success: true,
      data: departmentTeachers
    });

  } catch (error) {
    console.error('Error fetching department teachers:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách giáo viên trong tổ bộ môn' });
  }
});

teacherRoutes.get('/department-teacher-stats', isAuth, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const currentTeacher = await Teacher.findOne({ email: userEmail });

    if (!currentTeacher) {
      return res.status(403).json({ message: 'Không tìm thấy thông tin giáo viên' });
    }

    let departmentTeachers = await Teacher.find({ department: currentTeacher.department });
    departmentTeachers = sortTeachersByName(departmentTeachers);
    const departmentSubjects = await Subject.find({ department: currentTeacher.department });

    const teacherStats = await Promise.all(departmentTeachers.map(async (teacher) => {
      const assignments = await TeacherAssignment.find({ 
        teacher: teacher._id,
        subject: { $in: departmentSubjects.map(s => s._id) }
      }).populate('class', 'name').populate('subject', 'name');

      const assignmentDetails = assignments.map(a => ({
        class: a.class.name,
        subject: a.subject.name,
        lessons: a.completedLessons
      }));

      const homeroom = await Homeroom.findOne({ teacher: teacher._id })
        .populate('class', 'name grade');

      return {
        teacherId: teacher._id,
        teacherName: teacher.name,
        homeroom: homeroom ? {
          id: homeroom.class._id,
          name: homeroom.class.name,
          grade: homeroom.class.grade,
          reducedLessonsPerWeek: homeroom.reducedLessonsPerWeek,
          reducedWeeks: homeroom.reducedWeeks,
          totalReducedLessons: homeroom.totalReducedLessons
        } : null,
        assignments: assignmentDetails
      };
    }));

    res.json(teacherStats);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

teacherRoutes.get('/', isAuth, async (req, res) => {
  try {
    let teachers = await Teacher.find()
      .populate('department', 'name')
      .populate('teachingSubjects', 'name')
      .lean();
    
    teachers = sortTeachersByName(teachers);

    const teachersWithHomeroom = await Promise.all(teachers.map(async (teacher) => {
      const homeroom = await Homeroom.findOne({ teacher: teacher._id })
        .populate('class', 'name grade');

      return {
        ...teacher,
        homeroom: homeroom ? {
          class: homeroom.class.name,
          grade: homeroom.class.grade,
          reducedLessonsPerWeek: homeroom.reducedLessonsPerWeek,
          reducedWeeks: homeroom.reducedWeeks,
          totalReducedLessons: homeroom.totalReducedLessons
        } : null
      };
    }));

    res.json(teachersWithHomeroom);
  } catch (error) {
    console.error('Error fetching all teachers:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách tất cả giáo viên', error: error.message });
  }
});

teacherRoutes.get('/teacher/:id', isAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = await Teacher.findById(id)
      .populate('department', 'name')
      .populate('teachingSubjects', 'name')
      .lean();

    if (!teacher) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin giáo viên' });
    }

    const homeroom = await Homeroom.findOne({ teacher: id })
      .populate('class', 'name grade');

    const teacherWithHomeroom = {
      ...teacher,
      homeroom: homeroom ? {
        class: homeroom.class.name,
        grade: homeroom.class.grade,
        reducedLessonsPerWeek: homeroom.reducedLessonsPerWeek,
        reducedWeeks: homeroom.reducedWeeks,
        totalReducedLessons: homeroom.totalReducedLessons
      } : null
    };

    res.json(teacherWithHomeroom);
  } catch (error) {
    console.error('Error fetching teacher:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy thông tin giáo viên' });
  }
});

teacherRoutes.post('/create', isAuth, async (req, res) => {
  try {
    const { 
      email, 
      name, 
      phone, 
      department, 
      type, 
      lessonsPerWeek, 
      teachingWeeks,
      reductions, // Mảng các reduction thay vì các trường riêng lẻ
      teachingSubjects
    } = req.body;

    // Kiểm tra email tồn tại
    const existingTeacher = await Teacher.findOne({ email });
    if (existingTeacher) {
      return res.status(400).json({ message: 'Email đã được sử dụng' });
    }

    // Kiểm tra số điện thoại
    const phoneValue = phone && phone.trim() !== '' ? phone : undefined;
    if (phoneValue) {
      const existingPhoneNumber = await Teacher.findOne({ phone: phoneValue });
      if (existingPhoneNumber) {
        return res.status(400).json({ message: 'Số điện thoại đã được sử dụng' });
      }
    }

    const position = 'Giáo viên';
    let basicTeachingLessons = 0;
    let totalReducedLessons = 0;

    // Tính toán cho giáo viên cơ hữu
    if (type === 'Cơ hữu') {
      if (!lessonsPerWeek || !teachingWeeks) {
        return res.status(400).json({ 
          message: 'Số tiết dạy một tuần và số tuần dạy là bắt buộc cho giáo viên cơ hữu' 
        });
      }
      basicTeachingLessons = lessonsPerWeek * teachingWeeks;

      // Tính tổng số tiết giảm từ mảng reductions nếu có
      if (reductions && reductions.length > 0) {
        // Kiểm tra tính hợp lệ của mỗi reduction
        for (const reduction of reductions) {
          if (!reduction.reducedLessonsPerWeek || !reduction.reducedWeeks || !reduction.reductionReason) {
            return res.status(400).json({ 
              message: 'Thông tin giảm trừ không hợp lệ. Vui lòng kiểm tra lại số tiết, số tuần và lý do giảm trừ' 
            });
          }
          // Tính lại reducedLessons cho mỗi reduction để đảm bảo tính chính xác
          reduction.reducedLessons = reduction.reducedLessonsPerWeek * reduction.reducedWeeks;
        }
        // Tính tổng số tiết giảm từ tất cả các reduction
        totalReducedLessons = reductions.reduce((total, reduction) => 
          total + reduction.reducedLessons, 0
        );
      }
    }

    const teacherData = {
      email,
      name,
      ...(phoneValue && { phone: phoneValue }),
      position,
      department,
      type,
      teachingSubjects,
      ...(type === 'Cơ hữu' && { 
        lessonsPerWeek, 
        teachingWeeks, 
        basicTeachingLessons,
        ...(reductions && reductions.length > 0 && {
          reductions,
          totalReducedLessons
        })
      })
    };

    const newTeacher = new Teacher(teacherData);
    const savedTeacher = await newTeacher.save();

    await Result.create({
      action: 'CREATE',
      user: req.user._id,
      entityType: 'Teacher',
      entityId: savedTeacher._id,
      dataAfter: savedTeacher.toObject()
    });

    res.status(201).json({
      message: 'Giáo viên đã được tạo thành công',
      teacher: savedTeacher
    });
  } catch (error) {
    console.error('Error creating teacher:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

teacherRoutes.post('/create-many', isAuth, async (req, res) => {
  try {
    const { teachers } = req.body;

    if (!Array.isArray(teachers) || teachers.length === 0) {
      return res.status(400).json({ message: 'Danh sách giáo viên không hợp lệ' });
    }

    const createdTeachers = [];
    const errors = [];
    let resultData = {
      action: 'CREATE',
      user: req.user._id,
      entityType: 'Teacher',
      entityId: [],
      dataAfter: []
    };

    for (const teacherData of teachers) {
      try {
        const { 
          email, 
          name, 
          phone, 
          department, 
          teachingSubjects,
          type, 
          lessonsPerWeek, 
          teachingWeeks,
          reductions
        } = teacherData;

        const existingTeacher = await Teacher.findOne({ email });
        if (existingTeacher) {
          errors.push({ email, message: 'Email đã được sử dụng' });
          continue;
        }

        if (phone) {
          const existingPhoneNumber = await Teacher.findOne({ phone });
          if (existingPhoneNumber) {
            errors.push({ email, message: 'Số điện thoại đã được sử dụng' });
            continue;
          }
        }

        let basicTeachingLessons = 0;
        let totalReducedLessons = 0;

        if (type === 'Cơ hữu') {
          if (!lessonsPerWeek || !teachingWeeks) {
            errors.push({ email, message: 'Số tiết dạy một tuần và số tuần dạy là bắt buộc cho giáo viên cơ hữu' });
            continue;
          }
          basicTeachingLessons = lessonsPerWeek * teachingWeeks;

          if (reductions && reductions.length > 0) {
            for (const reduction of reductions) {
              if (!reduction.reducedLessonsPerWeek || !reduction.reducedWeeks || !reduction.reductionReason) {
                errors.push({ email, message: 'Thông tin giảm trừ không đầy đủ' });
                continue;
              }
              
              reduction.reducedLessons = reduction.reducedLessonsPerWeek * reduction.reducedWeeks;
              totalReducedLessons += reduction.reducedLessons;
            }
          }
        }

        const newTeacher = new Teacher({
          email,
          name,
          ...(phone && { phone }),
          position: 'Giáo viên',
          department,
          teachingSubjects,
          type,
          totalAssignment: 0,
          ...(type === 'Cơ hữu' && { 
            lessonsPerWeek, 
            teachingWeeks, 
            basicTeachingLessons,
            ...(reductions && reductions.length > 0 && {
              reductions,
              totalReducedLessons
            })
          })
        });

        const savedTeacher = await newTeacher.save();
        createdTeachers.push(savedTeacher);

        // Collect data for result
        resultData.entityId.push(savedTeacher._id);
        resultData.dataAfter.push(savedTeacher.toObject());

      } catch (error) {
        errors.push({ 
          email: teacherData.email, 
          message: error.message || 'Lỗi khi tạo giáo viên' 
        });
      }
    }

    // Create result record if there are successfully created teachers
    if (resultData.entityId.length > 0) {
      await Result.create(resultData);
    }

    res.status(201).json({
      message: 'Quá trình tạo giáo viên hoàn tất',
      createdTeachers,
      errors
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

teacherRoutes.post('/assign-homeroom', isAuth, async (req, res) => {
  try {
    const { teacherId, classId, reducedLessonsPerWeek, reducedWeeks } = req.body;

    if (!teacherId || !classId) {
      return res.status(400).json({ message: 'ID giáo viên và ID lớp là bắt buộc' });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: 'Không tìm thấy giáo viên' });
    }

    const classObj = await Class.findById(classId);
    if (!classObj) {
      return res.status(404).json({ message: 'Không tìm thấy lớp học' });
    }

    // Check if there's already a homeroom assignment for this class
    const existingHomeroom = await Homeroom.findOne({ class: classId });
    if (existingHomeroom) {
      return res.status(400).json({ message: 'Lớp học này đã có giáo viên chủ nhiệm' });
    }

    const totalReducedLessons = reducedLessonsPerWeek * reducedWeeks;

    const newHomeroom = new Homeroom({
      teacher: teacherId,
      class: classId,
      reducedLessonsPerWeek,
      reducedWeeks,
      totalReducedLessons,
      reductionReason: 'GVCN'
    });

    const savedHomeroom = await newHomeroom.save();

    // Update teacher's reduction information
    teacher.reducedLessonsPerWeek += reducedLessonsPerWeek;
    teacher.reducedWeeks += reducedWeeks;
    teacher.totalReducedLessons += totalReducedLessons;
    teacher.reductionReason = teacher.reductionReason 
      ? `${teacher.reductionReason}, GVCN` 
      : "GVCN";

    const updatedTeacher = await teacher.save();

    await Result.create({
      action: 'CREATE',
      user: req.user._id,
      entityType: 'Homeroom',
      entityId: savedHomeroom._id,
      dataAfter: savedHomeroom.toObject()
    });

    await Result.create({
      action: 'UPDATE',
      user: req.user._id,
      entityType: 'Teacher',
      entityId: teacher._id,
      dataAfter: updatedTeacher.toObject()
    });

    res.json({
      message: 'Đã chỉ định lớp chủ nhiệm và cập nhật thông tin giảm giờ thành công',
      homeroom: savedHomeroom,
      teacher: updatedTeacher
    });
  } catch (error) {
    console.error('Error assigning homeroom:', error);
    res.status(500).json({ message: 'Lỗi server khi chỉ định lớp chủ nhiệm', error: error.message });
  }
});

teacherRoutes.put('/update/:id', isAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      phone,
      position,
      department,
      teachingSubjects,
      type,
      lessonsPerWeek,
      teachingWeeks,
      reductions
    } = req.body;

    const teacher = await Teacher.findById(id);

    if (!teacher) {
      return res.status(404).json({ message: 'Không tìm thấy giáo viên' });
    }

    const teacherBefore = JSON.parse(JSON.stringify(teacher.toObject()));

    // Cập nhật thông tin cơ bản
    teacher.name = name || teacher.name;
    teacher.email = email || teacher.email;
    teacher.phone = phone || teacher.phone;
    teacher.position = position || teacher.position;
    teacher.department = department || teacher.department;
    teacher.teachingSubjects = teachingSubjects || teacher.teachingSubjects;
    teacher.type = type;

    if (type === 'Cơ hữu') {
      teacher.lessonsPerWeek = lessonsPerWeek !== undefined ? lessonsPerWeek : teacher.lessonsPerWeek;
      teacher.teachingWeeks = teachingWeeks !== undefined ? teachingWeeks : teacher.teachingWeeks;
      teacher.basicTeachingLessons = teacher.lessonsPerWeek * teacher.teachingWeeks;

      // Xử lý reductions mới
      if (reductions && Array.isArray(reductions)) {
        // Validate và tính toán reductions
        const validatedReductions = reductions.map(reduction => ({
          reducedLessonsPerWeek: parseInt(reduction.reducedLessonsPerWeek),
          reducedWeeks: parseInt(reduction.reducedWeeks),
          reductionReason: reduction.reductionReason,
          reducedLessons: parseInt(reduction.reducedLessonsPerWeek) * parseInt(reduction.reducedWeeks)
        }));

        teacher.reductions = validatedReductions;
        teacher.totalReducedLessons = validatedReductions.reduce(
          (total, reduction) => total + reduction.reducedLessons, 
          0
        );
      } else {
        // Nếu không có reductions mới, reset về mảng rỗng
        teacher.reductions = [];
        teacher.totalReducedLessons = 0;
      }
    } else if (type === 'Thỉnh giảng') {
      // Reset tất cả các trường liên quan đến giảng dạy và giảm trừ
      teacher.lessonsPerWeek = 0;
      teacher.teachingWeeks = 0;
      teacher.basicTeachingLessons = 0;
      teacher.reductions = [];
      teacher.totalReducedLessons = 0;
    }

    const updatedTeacher = await teacher.save();

    await Result.create({
      action: 'UPDATE',
      user: req.user._id,
      entityType: 'Teacher',
      entityId: id,
      dataBefore: teacherBefore,
      dataAfter: updatedTeacher.toObject()
    });

    res.json({
      message: 'Cập nhật giáo viên thành công',
      teacher: updatedTeacher
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

teacherRoutes.delete('/delete/:id', isAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const teacher = await Teacher.findById(id);

    if (!teacher) {
      return res.status(404).json({ message: 'Không tìm thấy giáo viên' });
    }

    // Check if the teacher has a homeroom assignment
    const homeroom = await Homeroom.findOne({ teacher: id });
    if (homeroom) {
      return res.status(400).json({ message: 'Không thể xóa giáo viên đang chủ nhiệm lớp' });
    }

    const hasAssignments = await TeacherAssignment.exists({ teacher: id });
    if (hasAssignments) {
      return res.status(400).json({ message: 'Không thể xóa giáo viên đã có khai báo giảng dạy' });
    }

    await Result.create({
      action: 'DELETE',
      user: req.user._id,
      entityType: 'Teacher',
      entityId: id,
      dataBefore: teacher.toObject()
    });

    await Teacher.findByIdAndDelete(id);

    res.json({
      message: 'Xóa giáo viên thành công',
      id: id
    });
  } catch (error) {
    console.error('Error deleting teacher:', error);
    res.status(500).json({ message: 'Lỗi server khi xóa giáo viên', error: error.message });
  }
});

teacherRoutes.post('/reset-assignments', isAuth, async (req, res) => {
  try {
    // Lấy danh sách giáo viên trước khi cập nhật để lưu vào Result
    const teachersBefore = await Teacher.find().lean();
    
    // Cập nhật totalAssignment và declaredTeachingLessons về 0 cho tất cả giáo viên
    const result = await Teacher.updateMany(
      {}, // filter rỗng để cập nhật tất cả documents
      { $set: { 
          totalAssignment: 0,
          declaredTeachingLessons: 0 
        } 
      }
    );

    // Lấy danh sách giáo viên sau khi cập nhật
    const teachersAfter = await Teacher.find().lean();

    // Ghi log cho mỗi giáo viên đã được cập nhật
    await Promise.all(teachersAfter.map(async (teacherAfter) => {
      const teacherBefore = teachersBefore.find(t => t._id.toString() === teacherAfter._id.toString());
      
      await Result.create({
        action: 'UPDATE',
        user: req.user._id,  
        entityType: 'Teacher',
        entityId: teacherAfter._id,
        dataBefore: teacherBefore,
        dataAfter: teacherAfter
      });
    }));

    res.json({
      message: 'Đã reset totalAssignment và declaredTeachingLessons của tất cả giáo viên về 0',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error resetting teacher assignments:', error);
    res.status(500).json({ 
      message: 'Lỗi khi reset dữ liệu của giáo viên', 
      error: error.message 
    });
  }
});

teacherRoutes.post('/convert-old-reductions', isAuth, async (req, res) => {
  try {
    const updates = await Teacher.updateMany(
      {
        $and: [
          { reductions: { $exists: true, $size: 0 } },
          { $or: [
            { reducedLessonsPerWeek: { $exists: true, $ne: null } },
            { reducedWeeks: { $exists: true, $ne: null } },
            { reductionReason: { $exists: true, $ne: null } }
          ]}
        ]
      },
      [
        {
          $set: {
            reductions: {
              $cond: {
                if: {
                  $and: [
                    { $gt: ["$reducedLessonsPerWeek", 0] },
                    { $gt: ["$reducedWeeks", 0] },
                    { $ne: ["$reductionReason", ""] }
                  ]
                },
                then: [{
                  reducedLessonsPerWeek: "$reducedLessonsPerWeek",
                  reducedWeeks: "$reducedWeeks",
                  reductionReason: "$reductionReason",
                  reducedLessons: { $multiply: ["$reducedLessonsPerWeek", "$reducedWeeks"] }
                }],
                else: []
              }
            },
            totalReducedLessons: {
              $multiply: [
                { $ifNull: ["$reducedLessonsPerWeek", 0] },
                { $ifNull: ["$reducedWeeks", 0] }
              ]
            },
            reducedLessonsPerWeek: "$$REMOVE",
            reducedWeeks: "$$REMOVE",
            reductionReason: "$$REMOVE"
          }
        }
      ]
    );

    res.json({
      success: true,
      message: 'Đã chuyển đổi dữ liệu giảm trừ thành công',
      modifiedCount: updates.modifiedCount
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default teacherRoutes;