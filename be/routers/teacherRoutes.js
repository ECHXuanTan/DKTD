import express from 'express';
import Teacher from '../models/teacherModel.js';
import Department from '../models/departmentModel.js';
import TeacherAssignment from '../models/teacherAssignmentModels.js';
import Subject from '../models/subjectModels.js';
import Result from '../models/resultModel.js';
import { isAuth, isAdmin } from '../utils.js'; 

const teacherRoutes = express.Router();

teacherRoutes.get('/teacher', isAuth, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const teacher = await Teacher.findOne({ email: userEmail })
      .populate('department', 'name')
      .populate('teachingSubjects', 'name');

    if (!teacher) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin giáo viên' });
    }

    res.json(teacher);
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

    const departmentTeachers = await Teacher.find({ department: currentTeacher.department._id })
      .populate('department', 'id name totalAssignmentTime declaredTeachingLessons')
      .populate('teachingSubjects', 'name');

    const teachersWithAssignments = await Promise.all(departmentTeachers.map(async (teacher) => {
      const assignments = await TeacherAssignment.find({ teacher: teacher._id })
        .populate('class', 'name')
        .populate('subject', 'name');

      return {
        ...teacher.toObject(),
        assignments: assignments.map(assignment => ({
          class: assignment.class.name,
          subject: assignment.subject.name,
          completedLessons: assignment.completedLessons
        }))
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

teacherRoutes.get('/department-teacher-stats', isAuth, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const currentTeacher = await Teacher.findOne({ email: userEmail });

    if (!currentTeacher) {
      return res.status(403).json({ message: 'Không tìm thấy thông tin giáo viên' });
    }

    const departmentTeachers = await Teacher.find({ department: currentTeacher.department });
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

      return {
        teacherId: teacher._id,
        teacherName: teacher.name,
        assignments: assignmentDetails
      };
    }));

    res.json(teacherStats);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

teacherRoutes.get('/department-class-stats', isAuth, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const currentTeacher = await Teacher.findOne({ email: userEmail });

    if (!currentTeacher) {
      return res.status(403).json({ message: 'Không tìm thấy thông tin giáo viên' });
    }

    const departmentSubjects = await Subject.find({ department: currentTeacher.department });

    const classAssignments = await TeacherAssignment.aggregate([
      {
        $match: {
          subject: { $in: departmentSubjects.map(s => s._id) }
        }
      },
      {
        $group: {
          _id: { class: '$class', subject: '$subject' },
          teachers: { 
            $push: { 
              teacher: '$teacher', 
              lessons: '$completedLessons' 
            } 
          }
        }
      },
      {
        $lookup: {
          from: 'classes',
          localField: '_id.class',
          foreignField: '_id',
          as: 'classInfo'
        }
      },
      {
        $lookup: {
          from: 'subjects',
          localField: '_id.subject',
          foreignField: '_id',
          as: 'subjectInfo'
        }
      },
      {
        $lookup: {
          from: 'teachers',
          localField: 'teachers.teacher',
          foreignField: '_id',
          as: 'teacherInfo'
        }
      },
      {
        $project: {
          className: { $arrayElemAt: ['$classInfo.name', 0] },
          subjectName: { $arrayElemAt: ['$subjectInfo.name', 0] },
          teachers: {
            $map: {
              input: '$teachers',
              as: 'teacher',
              in: {
                name: {
                  $arrayElemAt: [
                    '$teacherInfo.name',
                    { $indexOfArray: ['$teacherInfo._id', '$$teacher.teacher'] }
                  ]
                },
                lessons: '$$teacher.lessons'
              }
            }
          }
        }
      }
    ]);

    res.json(classAssignments);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

teacherRoutes.get('/', isAuth, async (req, res) => {
  try {
    const teachers = await Teacher.find()
      .populate('department', 'name')
      .populate('teachingSubjects', 'name')
      .lean();
    res.json(teachers);
  } catch (error) {
    console.error('Error fetching all teachers:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách tất cả giáo viên', error: error.message });
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
      reducedLessonsPerWeek,
      reducedWeeks,
      reductionReason,
      teachingSubjects
    } = req.body;

    // Check if an email already exists
    const existingTeacher = await Teacher.findOne({ email });
    if (existingTeacher) {
      return res.status(400).json({ message: 'Email đã được sử dụng' });
    }

    // Only check for duplicate phone if phone is provided and non-empty
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

    // Additional validations for "Cơ hữu" teachers
    if (type === 'Cơ hữu') {
      if (!lessonsPerWeek || !teachingWeeks) {
        return res.status(400).json({ message: 'Số tiết dạy một tuần và số tuần dạy là bắt buộc cho giáo viên cơ hữu' });
      }
      basicTeachingLessons = lessonsPerWeek * teachingWeeks;
      totalReducedLessons = reducedLessonsPerWeek * reducedWeeks;
    }

    // Construct the new teacher object, conditionally including phone if it's defined
    const newTeacher = new Teacher({
      email,
      name,
      ...(phoneValue && { phone: phoneValue }), // Only add phone if it's defined
      position,
      department,
      type,
      teachingSubjects,
      ...(type === 'Cơ hữu' && { 
        lessonsPerWeek, 
        teachingWeeks, 
        basicTeachingLessons,
        reducedLessonsPerWeek,
        reducedWeeks,
        totalReducedLessons,
        reductionReason
      })
    });

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

    for (const teacherData of teachers) {
      const { 
        email, 
        name, 
        phone, 
        position,
        department, 
        type, 
        teachingSubjects,
        lessonsPerWeek, 
        teachingWeeks,
        reducedLessonsPerWeek,
        reducedWeeks,
        reductionReason,
        homeroom
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
        if (reducedLessonsPerWeek && reducedWeeks) {
          totalReducedLessons = reducedLessonsPerWeek * reducedWeeks;
        }
      }

      const newTeacher = new Teacher({
        email,
        name,
        phone,
        position,
        department,
        type,
        teachingSubjects,
        totalAssignment: 0,
        lessonsPerWeek, 
        teachingWeeks, 
        basicTeachingLessons,
        reducedLessonsPerWeek,
        reducedWeeks,
        totalReducedLessons,
        reductionReason,
        homeroom
      });

      const savedTeacher = await newTeacher.save();

      await Result.create({
        action: 'CREATE',
        user: req.user._id,
        entityType: 'Teacher',
        entityId: savedTeacher._id,
        dataAfter: savedTeacher.toObject()
      });

      createdTeachers.push(savedTeacher);
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
      reducedLessonsPerWeek,
      reducedWeeks,
      reductionReason,
      homeroom
    } = req.body;

    const teacher = await Teacher.findById(id);

    if (!teacher) {
      return res.status(404).json({ message: 'Không tìm thấy giáo viên' });
    }

    const teacherBefore = JSON.parse(JSON.stringify(teacher.toObject()));

    teacher.name = name || teacher.name;
    teacher.email = email || teacher.email;
    teacher.phone = phone || teacher.phone;
    teacher.position = position || teacher.position;
    teacher.department = department || teacher.department;
    teacher.teachingSubjects = teachingSubjects || teacher.teachingSubjects;
    teacher.type = type;
    teacher.homeroom = homeroom || teacher.homeroom;

    if (type === 'Cơ hữu') {
      teacher.lessonsPerWeek = lessonsPerWeek !== undefined ? lessonsPerWeek : teacher.lessonsPerWeek;
      teacher.teachingWeeks = teachingWeeks !== undefined ? teachingWeeks : teacher.teachingWeeks;
      teacher.basicTeachingLessons = teacher.lessonsPerWeek * teacher.teachingWeeks;
      teacher.reducedLessonsPerWeek = reducedLessonsPerWeek !== undefined ? reducedLessonsPerWeek : teacher.reducedLessonsPerWeek;
      teacher.reducedWeeks = reducedWeeks !== undefined ? reducedWeeks : teacher.reducedWeeks;
      teacher.totalReducedLessons = teacher.reducedLessonsPerWeek * teacher.reducedWeeks;
      teacher.reductionReason = reductionReason || teacher.reductionReason;
    } else if (type === 'Thỉnh giảng') {
      teacher.lessonsPerWeek = 0;
      teacher.teachingWeeks = 0;
      teacher.basicTeachingLessons = 0;
      teacher.reducedLessonsPerWeek = 0;
      teacher.reducedWeeks = 0;
      teacher.totalReducedLessons = 0;
      teacher.reductionReason = '';
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
    res.status(500).json({ message: 'Lỗi server', error: error.message });
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

    res.json(teacher);
  } catch (error) {
    console.error('Error fetching teacher:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy thông tin giáo viên' });
  }
});

export default teacherRoutes;