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
    const teacher = await Teacher.findOne({ email: userEmail }).populate('department', 'name');

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

    if (!currentTeacher.isLeader) {
      return res.status(403).json({ message: 'Chỉ trưởng bộ môn mới có quyền truy cập thông tin này' });
    }

    const departmentTeachers = await Teacher.find({ department: currentTeacher.department._id })
      .populate('department', 'id name totalAssignmentTime declaredTeachingLessons');

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

    if (!currentTeacher || !currentTeacher.isLeader) {
      return res.status(403).json({ message: 'Chỉ tổ trưởng mới có quyền truy cập thông tin này' });
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

    if (!currentTeacher || !currentTeacher.isLeader) {
      return res.status(403).json({ message: 'Chỉ tổ trưởng mới có quyền truy cập thông tin này' });
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
    const teachers = await Teacher.find().populate('department', 'name').lean();
    res.json(teachers);
  } catch (error) {
    console.error('Error fetching all teachers:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách tất cả giáo viên', error: error.message });
  }
});

teacherRoutes.post('/create', isAuth, async (req, res) => {
  try {
    const { email, name, phone, department, type, lessonsPerWeek, teachingWeeks } = req.body;

    const existingTeacher = await Teacher.findOne({ email });
    if (existingTeacher) {
      return res.status(400).json({ message: 'Email đã được sử dụng' });
    }
    
    const position = 'Giáo viên';
    const basicTeachingLessons = lessonsPerWeek * teachingWeeks;

    const newTeacher = new Teacher({
      email,
      name,
      phone,
      position,
      department,
      type,
      lessonsPerWeek,
      teachingWeeks,
      basicTeachingLessons
    });

    const savedTeacher = await newTeacher.save();

    // Create result
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
      const { email, name, phone, department, type, lessonsPerWeek, teachingWeeks } = teacherData;

      const existingTeacher = await Teacher.findOne({ email });
      if (existingTeacher) {
        errors.push({ email, message: 'Email đã được sử dụng' });
        continue;
      }

      const position = 'Giáo viên';
      const basicTeachingLessons = lessonsPerWeek * teachingWeeks;

      const newTeacher = new Teacher({
        email,
        name,
        phone,
        position,
        department,
        type,
        lessonsPerWeek,
        teachingWeeks,
        basicTeachingLessons
      });

      const savedTeacher = await newTeacher.save();

      // Create result
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
    const { name, email, phone, department, type, lessonsPerWeek, teachingWeeks } = req.body;

    const teacher = await Teacher.findById(id);

    if (!teacher) {
      return res.status(404).json({ message: 'Không tìm thấy giáo viên' });
    }

    const teacherBefore = JSON.parse(JSON.stringify(teacher.toObject()));

    teacher.name = name || teacher.name;
    teacher.email = email || teacher.email;
    teacher.phone = phone || teacher.phone;
    teacher.department = department || teacher.department;
    teacher.type = type || teacher.type;

    if (lessonsPerWeek !== undefined) {
      teacher.lessonsPerWeek = lessonsPerWeek;
    }
    if (teachingWeeks !== undefined) {
      teacher.teachingWeeks = teachingWeeks;
    }

    if (lessonsPerWeek !== undefined || teachingWeeks !== undefined) {
      teacher.basicTeachingLessons = teacher.lessonsPerWeek * teacher.teachingWeeks;
    }

    const updatedTeacher = await teacher.save();

    // Create result
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

    // Create result before deleting
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
    const teacher = await Teacher.findById(id).populate('department', 'name').lean();

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