import express from 'express';
import mongoose from 'mongoose';
import { isAuth, isAdmin } from '../utils.js';
import Teacher from '../models/teacherModel.js';
import TeacherAssignment from '../models/teacherAssignmentModels.js';
import Class from '../models/classModels.js';
import Subject from '../models/subjectModels.js';
import User from '../models/userModel.js';
import Department from '../models/departmentModel.js';

const statisticsRouter = express.Router();

statisticsRouter.get('/department-teachers', isAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('teacher');
    if (!user || !user.teacher) {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }

    if (!user.teacher.isLeader) {
      return res.status(403).json({ message: 'Chỉ tổ trưởng mới có quyền truy cập thông tin này' });
    }

    const departmentId = user.teacher.department;

    const teachers = await Teacher.find({ department: departmentId }).populate('department', 'name');

    const teachersData = await Promise.all(teachers.map(async (teacher) => {
      const assignments = await TeacherAssignment.find({ teacher: teacher._id })
        .populate('class', 'name grade')
        .populate('subject', 'name');

      const teachingDetails = assignments.map(assignment => ({
        className: assignment.class.name,
        grade: assignment.class.grade,
        subjectName: assignment.subject.name,
        completedLessons: assignment.completedLessons
      }));

      return {
        id: teacher._id,
        name: teacher.name,
        type: teacher.type,
        lessonsPerWeek: teacher.lessonsPerWeek,
        teachingWeeks: teacher.teachingWeeks,
        basicTeachingLessons: teacher.basicTeachingLessons,
        totalAssignment: teacher.totalAssignment,
        departmentName: teacher.department.name,
        teachingDetails: teachingDetails
      };
    }));

    res.status(200).json(teachersData);
  } catch (error) {
    console.error('Error in getting department teachers:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});
 
statisticsRouter.get('/all-teachers', isAuth, async (req, res) => {
  try {
    const teachers = await Teacher.find().populate('department', 'name');

    const teachersData = await Promise.all(teachers.map(async (teacher) => {
      const assignments = await TeacherAssignment.find({ teacher: teacher._id })
        .populate('class', 'name grade')
        .populate('subject', 'name');

      const teachingDetails = assignments.map(assignment => ({
        className: assignment.class.name,
        grade: assignment.class.grade,
        subjectName: assignment.subject.name,
        completedLessons: assignment.completedLessons
      }));

      return {
        id: teacher._id,
        name: teacher.name,
        type: teacher.type,
        lessonsPerWeek: teacher.lessonsPerWeek,
        teachingWeeks: teacher.teachingWeeks,
        basicTeachingLessons: teacher.basicTeachingLessons,
        totalAssignment: teacher.totalAssignment,
        departmentName: teacher.department.name,
        teachingDetails: teachingDetails
      };
    }));

    res.status(200).json(teachersData);
  } catch (error) {
    console.error('Error in getting all teachers:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

statisticsRouter.get('/teachers-below-basic', isAuth, async (req, res) => {
  try {
    const { departmentId } = req.query;
    let query = {
      $expr: { $lt: ['$totalAssignment', '$basicTeachingLessons'] }
    };

    if (departmentId) {
      query.department = new mongoose.Types.ObjectId(departmentId);
    }

    const teachers = await Teacher.find(query).populate('department', 'name');

    const teachersData = await Promise.all(teachers.map(async (teacher) => {
      const assignments = await TeacherAssignment.find({ teacher: teacher._id })
        .populate('class', 'name grade')
        .populate('subject', 'name');

      const teachingDetails = assignments.map(assignment => ({
        className: assignment.class.name,
        grade: assignment.class.grade,
        subjectName: assignment.subject.name,
        completedLessons: assignment.completedLessons
      }));

      return {
        id: teacher._id,
        name: teacher.name,
        type: teacher.type,
        lessonsPerWeek: teacher.lessonsPerWeek,
        teachingWeeks: teacher.teachingWeeks,
        basicTeachingLessons: teacher.basicTeachingLessons,
        totalAssignment: teacher.totalAssignment,
        departmentName: teacher.department.name,
        teachingDetails: teachingDetails
      };
    }));

    res.status(200).json(teachersData);
  } catch (error) {
    console.error('Error in getting teachers below basic lessons:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

statisticsRouter.get('/teachers-above-threshold', isAuth, async (req, res) => {
  try {
    const { departmentId } = req.query;
    let query = {
      $expr: {
        $gt: [
          { $subtract: ['$totalAssignment', '$basicTeachingLessons'] },
          { $multiply: ['$basicTeachingLessons', 0.25] }
        ]
      }
    };

    if (departmentId) {
      query.department = new mongoose.Types.ObjectId(departmentId);
    }

    const teachers = await Teacher.find(query).populate('department', 'name');

    const teachersData = await Promise.all(teachers.map(async (teacher) => {
      const assignments = await TeacherAssignment.find({ teacher: teacher._id })
        .populate('class', 'name grade')
        .populate('subject', 'name');

      const teachingDetails = assignments.map(assignment => ({
        className: assignment.class.name,
        grade: assignment.class.grade,
        subjectName: assignment.subject.name,
        completedLessons: assignment.completedLessons
      }));

      return {
        id: teacher._id,
        name: teacher.name,
        type: teacher.type,
        lessonsPerWeek: teacher.lessonsPerWeek,
        teachingWeeks: teacher.teachingWeeks,
        basicTeachingLessons: teacher.basicTeachingLessons,
        totalAssignment: teacher.totalAssignment,
        excessLessons: teacher.totalAssignment - teacher.basicTeachingLessons,
        departmentName: teacher.department.name,
        teachingDetails: teachingDetails
      };
    }));

    res.status(200).json(teachersData);
  } catch (error) {
    console.error('Error in getting teachers above threshold:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

statisticsRouter.get('/teacher-assignments/:teacherId', isAuth, async (req, res) => {
  try {
    const { teacherId } = req.params;

    const teacher = await Teacher.findById(teacherId).populate('department');
    if (!teacher) {
      return res.status(404).json({ message: 'Không tìm thấy giáo viên' });
    }

    const assignments = await TeacherAssignment.aggregate([
      {
        $match: { teacher: new mongoose.Types.ObjectId(teacherId) }
      },
      {
        $lookup: {
          from: 'classes',
          localField: 'class',
          foreignField: '_id',
          as: 'classInfo'
        }
      },
      {
        $unwind: '$classInfo'
      },
      {
        $lookup: {
          from: 'subjects',
          localField: 'subject',
          foreignField: '_id',
          as: 'subjectInfo'
        }
      },
      {
        $unwind: '$subjectInfo'
      },
      {
        $project: {
          grade: '$classInfo.grade',
          className: '$classInfo.name',
          subjectName: '$subjectInfo.name',
          assignedLessons: '$completedLessons',
          lessonCount: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$classInfo.subjects',
                  as: 'subject',
                  cond: { $eq: ['$$subject.subject', '$subject'] }
                }
              },
              0
            ]
          }
        }
      },
      {
        $project: {
          grade: 1,
          className: 1,
          classNameForSort: {
            $concat: [
              { $substr: ['$className', 0, 2] },  // Lấy 2 ký tự đầu (khối lớp)
              '_',  // Thêm dấu '_' để đảm bảo sắp xếp đúng
              { $substr: ['$className', 3, -1] }  // Lấy phần còn lại của tên lớp
            ]
          },
          subjectName: 1,
          assignedLessons: 1,
          declaredLessons: '$lessonCount.lessonCount'
        }
      },
      {
        $sort: { classNameForSort: 1 }  // Sắp xếp theo trường mới tạo
      }
    ]);

    const result = {
      teacherName: teacher.name,
      departmentName: teacher.department.name,
      basicTeachingLessons: teacher.basicTeachingLessons,
      teachingWeeks: teacher.teachingWeeks,
      lessonsPerWeek: teacher.lessonsPerWeek,
      totalAssignment: teacher.totalAssignment,
      assignments: assignments.map(assignment => ({
        grade: assignment.grade,
        className: assignment.className,
        subjectName: assignment.subjectName,
        assignedLessons: assignment.assignedLessons,
        declaredLessons: assignment.declaredLessons
      }))
    };

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in getting teacher assignments:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Endpoint để lấy tất cả giáo viên dưới mức cơ bản
statisticsRouter.get('/all-teachers-below-basic', isAuth, isAdmin, async (req, res) => {
  try {
    const excludedDepartment = await Department.findOne({ name: "Tổ Giáo vụ – Đào tạo" });

    const query = {
      $expr: { $lt: ['$totalAssignment', '$basicTeachingLessons'] },
      department: { $ne: excludedDepartment ? excludedDepartment._id : null }
    };

    const teachers = await Teacher.find(query).populate('department', 'name');

    const teachersData = await Promise.all(teachers.map(async (teacher) => {
      const assignments = await TeacherAssignment.find({ teacher: teacher._id })
        .populate('class', 'name grade')
        .populate('subject', 'name');

      const teachingDetails = assignments.map(assignment => ({
        className: assignment.class.name,
        grade: assignment.class.grade,
        subjectName: assignment.subject.name,
        completedLessons: assignment.completedLessons
      }));

      return {
        id: teacher._id,
        name: teacher.name,
        type: teacher.type,
        lessonsPerWeek: teacher.lessonsPerWeek,
        teachingWeeks: teacher.teachingWeeks,
        basicTeachingLessons: teacher.basicTeachingLessons,
        totalAssignment: teacher.totalAssignment,
        departmentName: teacher.department.name,
        teachingDetails: teachingDetails
      };
    }));

    res.status(200).json(teachersData);
  } catch (error) {
    console.error('Error in getting all teachers below basic:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Endpoint để lấy tất cả giáo viên trên ngưỡng
statisticsRouter.get('/all-teachers-above-threshold', isAuth, isAdmin, async (req, res) => {
  try {
    const excludedDepartment = await Department.findOne({ name: "Tổ Giáo vụ – Đào tạo" });

    const query = {
      $expr: {
        $gt: [
          { $subtract: ['$totalAssignment', '$basicTeachingLessons'] },
          { $multiply: ['$basicTeachingLessons', 0.25] }
        ]
      },
      department: { $ne: excludedDepartment ? excludedDepartment._id : null }
    };

    const teachers = await Teacher.find(query).populate('department', 'name');

    const teachersData = await Promise.all(teachers.map(async (teacher) => {
      const assignments = await TeacherAssignment.find({ teacher: teacher._id })
        .populate('class', 'name grade')
        .populate('subject', 'name');

      const teachingDetails = assignments.map(assignment => ({
        className: assignment.class.name,
        grade: assignment.class.grade,
        subjectName: assignment.subject.name,
        completedLessons: assignment.completedLessons
      }));

      return {
        id: teacher._id,
        name: teacher.name,
        type: teacher.type,
        lessonsPerWeek: teacher.lessonsPerWeek,
        teachingWeeks: teacher.teachingWeeks,
        basicTeachingLessons: teacher.basicTeachingLessons,
        totalAssignment: teacher.totalAssignment,
        excessLessons: teacher.totalAssignment - teacher.basicTeachingLessons,
        departmentName: teacher.department.name,
        teachingDetails: teachingDetails
      };
    }));

    res.status(200).json(teachersData);
  } catch (error) {
    console.error('Error in getting all teachers above threshold:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

statisticsRouter.get('/all-classes', isAuth, async (req, res) => {
  try {
    const teachersWithHomeroom = await Teacher.find({ homeroom: { $ne: null } })
      .select('name homeroom')
      .lean();

    const teacherMap = teachersWithHomeroom.reduce((acc, teacher) => {
      acc[teacher.homeroom.toString()] = teacher.name;
      return acc;
    }, {});

    const classes = await Class.find()
      .populate({
        path: 'subjects.subject',
        select: 'name',
        populate: {
          path: 'department',
          select: 'name'
        }
      })
      .lean();

    const classesWithExtraInfo = classes.map(classItem => {
      const homeroomTeacher = teacherMap[classItem._id.toString()];
      return {
        ...classItem,
        homeroomTeacher: homeroomTeacher || null,
        subjects: (classItem.subjects || []).concat(
          homeroomTeacher ? [{
            subject: {
              name: "CCSHL"
            },
            lessonCount: 72
          }] : []
        )
      };
    });

    res.status(200).json(classesWithExtraInfo);
  } catch (error) {
    console.error('Error in GET /all-classes:', error);
    res.status(500).json({ message: "Lỗi khi lấy danh sách lớp học", error: error.message });
  }
});

statisticsRouter.get('/subject-statistics', isAuth, async (req, res) => {
  try {
    const subjectStatistics = await Subject.aggregate([
      {
        $lookup: {
          from: 'classes',
          localField: '_id',
          foreignField: 'subjects.subject',
          as: 'classes'
        }
      },
      {
        $unwind: '$classes'
      },
      {
        $lookup: {
          from: 'teacherassignments',
          let: { subjectId: '$_id', classId: '$classes._id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$subject', '$$subjectId'] },
                    { $eq: ['$class', '$$classId'] }
                  ]
                }
              }
            },
            {
              $lookup: {
                from: 'teachers',
                localField: 'teacher',
                foreignField: '_id',
                as: 'teacherInfo'
              }
            },
            {
              $unwind: '$teacherInfo'
            }
          ],
          as: 'assignments'
        }
      },
      {
        $group: {
          _id: {
            subjectId: '$_id',
            subjectName: '$name',
            classId: '$classes._id',
            className: '$classes.name',
            grade: '$classes.grade'  // Thêm grade vào _id
          },
          declaredLessons: {
            $first: {
              $arrayElemAt: [
                {
                  $filter: {
                    input: '$classes.subjects',
                    as: 'subject',
                    cond: { $eq: ['$$subject.subject', '$_id'] }
                  }
                },
                0
              ]
            }
          },
          assignments: { $first: '$assignments' }
        }
      },
      {
        $project: {
          _id: 0,
          subjectId: '$_id.subjectId',
          subjectName: '$_id.subjectName',
          classId: '$_id.classId',
          className: '$_id.className',
          grade: '$_id.grade',  // Thêm grade vào kết quả
          declaredLessons: '$declaredLessons.lessonCount',
          assignments: {
            $map: {
              input: '$assignments',
              as: 'assignment',
              in: {
                teacherId: '$$assignment.teacher',
                teacherName: '$$assignment.teacherInfo.name',
                assignedLessons: '$$assignment.completedLessons'
              }
            }
          }
        }
      },
      {
        $group: {
          _id: {
            subjectId: '$subjectId',
            subjectName: '$subjectName'
          },
          classes: {
            $push: {
              classId: '$classId',
              className: '$className',
              grade: '$grade',  // Thêm grade vào mảng classes
              declaredLessons: '$declaredLessons',
              assignments: '$assignments'
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          subjectId: '$_id.subjectId',
          subjectName: '$_id.subjectName',
          classes: 1
        }
      },
      {
        $sort: { subjectName: 1 }
      }
    ]);

    res.status(200).json(subjectStatistics);
  } catch (error) {
    console.error('Error in getting subject statistics:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});


statisticsRouter.get('/class/:classId', isAuth, async (req, res) => {
  try {
    const { classId } = req.params;

    const teachersWithHomeroom = await Teacher.find({ homeroom: classId })
      .select('name homeroom')
      .lean();

    const homeroomTeacher = teachersWithHomeroom.length > 0 ? teachersWithHomeroom[0].name : null;

    const classData = await Class.findById(classId)
      .populate({
        path: 'subjects.subject',
        select: 'name'
      })
      .lean();

    if (!classData) {
      return res.status(404).json({ message: "Không tìm thấy lớp học với ID đã cung cấp" });
    }

    // Thêm môn học CCSHL nếu lớp có giáo viên chủ nhiệm
    const subjectsWithCCSHL = classData.subjects || [];
    if (homeroomTeacher) {
      subjectsWithCCSHL.push({
        subject: {
          name: "CCSHL"
        },
        lessonCount: 72
      });
    }

    const result = {
      ...classData,
      homeroomTeacher,
      subjects: subjectsWithCCSHL
    };

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in GET /class/:classId:', error);
    res.status(500).json({ message: "Lỗi khi lấy thông tin lớp học", error: error.message });
  }
});

statisticsRouter.get('/subject-statistics/:subjectId', isAuth, async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { grade } = req.query;

    let pipeline = [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(subjectId)
        }
      },
      {
        $lookup: {
          from: 'classes',
          localField: '_id',
          foreignField: 'subjects.subject',
          as: 'classes'
        }
      },
      {
        $unwind: '$classes'
      }
    ];

    if (grade && !isNaN(parseInt(grade))) {
      pipeline.push({
        $match: {
          'classes.grade': parseInt(grade)
        }
      });
    }

    pipeline = pipeline.concat([
      {
        $lookup: {
          from: 'teacherassignments',
          let: { subjectId: '$_id', classId: '$classes._id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$subject', '$$subjectId'] },
                    { $eq: ['$class', '$$classId'] }
                  ]
                }
              }
            },
            {
              $lookup: {
                from: 'teachers',
                localField: 'teacher',
                foreignField: '_id',
                as: 'teacherInfo'
              }
            },
            {
              $unwind: '$teacherInfo'
            }
          ],
          as: 'assignments'
        }
      },
      {
        $group: {
          _id: {
            subjectId: '$_id',
            subjectName: '$name',
            classId: '$classes._id',
            className: '$classes.name',
            grade: '$classes.grade'
          },
          declaredLessons: {
            $first: {
              $arrayElemAt: [
                {
                  $filter: {
                    input: '$classes.subjects',
                    as: 'subject',
                    cond: { $eq: ['$$subject.subject', '$_id'] }
                  }
                },
                0
              ]
            }
          },
          assignments: { $first: '$assignments' }
        }
      },
      {
        $project: {
          _id: 0,
          subjectId: '$_id.subjectId',
          subjectName: '$_id.subjectName',
          classId: '$_id.classId',
          className: '$_id.className',
          grade: '$_id.grade',
          declaredLessons: '$declaredLessons.lessonCount',
          assignments: {
            $map: {
              input: '$assignments',
              as: 'assignment',
              in: {
                teacherId: '$$assignment.teacher',
                teacherName: '$$assignment.teacherInfo.name',
                assignedLessons: '$$assignment.completedLessons'
              }
            }
          }
        }
      },
      {
        $group: {
          _id: {
            subjectId: '$subjectId',
            subjectName: '$subjectName'
          },
          classes: {
            $push: {
              classId: '$classId',
              className: '$className',
              grade: '$grade',
              declaredLessons: '$declaredLessons',
              assignments: '$assignments'
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          subjectId: '$_id.subjectId',
          subjectName: '$_id.subjectName',
          classes: 1
        }
      }
    ]);

    const subjectStatistics = await Subject.aggregate(pipeline);

    if (subjectStatistics.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy môn học' });
    }

    res.status(200).json(subjectStatistics[0]);
  } catch (error) {
    console.error('Error in getting subject statistics:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

statisticsRouter.get('/department-statistics', isAuth, async (req, res) => {
  try {
    const departmentStats = await Department.aggregate([
      {
        $match: {
          name: { $ne: "Tổ Giáo vụ – Đào tạo" }
        }
      },
      {
        $lookup: {
          from: 'teachers',
          localField: '_id',
          foreignField: 'department',
          as: 'teachers'
        }
      },
      {
        $lookup: {
          from: 'teacherassignments',
          let: { departmentId: '$_id' },
          pipeline: [
            {
              $lookup: {
                from: 'teachers',
                localField: 'teacher',
                foreignField: '_id',
                as: 'teacherInfo'
              }
            },
            {
              $unwind: '$teacherInfo'
            },
            {
              $match: {
                $expr: { $eq: ['$teacherInfo.department', '$$departmentId'] }
              }
            }
          ],
          as: 'assignments'
        }
      },
      {
        $project: {
          name: 1,
          totalAssignmentTime: { $ifNull: ['$totalAssignmentTime', 0] },
          declaredTeachingLessons: { $ifNull: ['$declaredTeachingLessons', 0] },
          teacherCount: { $size: '$teachers' },
          teachersWithDeclarations: {
            $size: {
              $setUnion: '$assignments.teacher'
            }
          },
          teachersAboveThreshold: {
            $size: {
              $filter: {
                input: '$teachers',
                as: 'teacher',
                cond: {
                  $gt: [
                    { $subtract: ['$$teacher.totalAssignment', '$$teacher.basicTeachingLessons'] },
                    { $multiply: ['$$teacher.basicTeachingLessons', 0.25] }
                  ]
                }
              }
            }
          },
          teachersBelowBasic: {
            $size: {
              $filter: {
                input: '$teachers',
                as: 'teacher',
                cond: { $lt: ['$$teacher.totalAssignment', '$$teacher.basicTeachingLessons'] }
              }
            }
          },
          createdAt: 1,
          updatedAt: 1
        }
      },
      {
        $sort: { name: 1 }
      }
    ]);

    res.status(200).json(departmentStats);
  } catch (error) {
    console.error('Error fetching department statistics:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy thống kê khoa', error: error.message });
  }
});

statisticsRouter.get('/department-teachers/:departmentId', isAuth, isAdmin, async (req, res) => {
  try {
    const { departmentId } = req.params;

    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({ message: 'Không tìm thấy khoa' });
    }

    const teachers = await Teacher.find({ department: departmentId });

    const teachersData = await Promise.all(teachers.map(async (teacher) => {
      const assignments = await TeacherAssignment.find({ teacher: teacher._id })
        .populate('class', 'name grade')
        .populate('subject', 'name');

      const teachingDetails = assignments.map(assignment => ({
        className: assignment.class.name,
        grade: assignment.class.grade,
        subjectName: assignment.subject.name,
        completedLessons: assignment.completedLessons
      }));

      return {
        id: teacher._id,
        name: teacher.name,
        type: teacher.type,
        lessonsPerWeek: teacher.lessonsPerWeek,
        teachingWeeks: teacher.teachingWeeks,
        basicTeachingLessons: teacher.basicTeachingLessons,
        totalAssignment: teacher.totalAssignment,
        departmentName: department.name,
        teachingDetails: teachingDetails
      };
    }));

    res.status(200).json(teachersData);
  } catch (error) {
    console.error('Error in getting department teachers:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

export default statisticsRouter;