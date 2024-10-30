import express from 'express';
import mongoose from 'mongoose';
import { isAuth, isAdmin } from '../utils.js';
import Teacher from '../models/teacherModel.js';
import TeacherAssignment from '../models/teacherAssignmentModels.js';
import Class from '../models/classModels.js';
import Subject from '../models/subjectModels.js';
import User from '../models/userModel.js';
import Department from '../models/departmentModel.js';
import Homeroom from '../models/homeroomModel.js';

const statisticsRouter = express.Router();

const calculateFinalBasicLessons = (basicTeachingLessons, totalReducedLessons, homeroomReduction) => {
  const totalReduction = (totalReducedLessons || 0) + (homeroomReduction || 0);
  return Math.max(0, basicTeachingLessons - totalReduction);
};

const getTeacherDataWithReductions = async (teacher) => {
  const assignments = await TeacherAssignment.find({ teacher: teacher._id })
    .populate('class', 'name grade')
    .populate('subject', 'name')

  const teachingDetails  = assignments.map(assignment => ({
    className: assignment.class?.name,
    grade: assignment.class?.grade,
    subject: assignment.subject?.name,
    completedLessons: assignment.completedLessons
  }));

  const homeroom = await Homeroom.findOne({ teacher: teacher._id })
    .populate('class', 'name grade');

  return {
    id: teacher._id,
    name: teacher.name,
    type: teacher.type,
    lessonsPerWeek: teacher.lessonsPerWeek,
    teachingWeeks: teacher.teachingWeeks,
    basicTeachingLessons: teacher.basicTeachingLessons,
    teacherReduction: {
      reducedLessonsPerWeek: teacher.reducedLessonsPerWeek || 0,
      reducedWeeks: teacher.reducedWeeks || 0,
      totalReducedLessons: teacher.totalReducedLessons || 0,
      reductionReason: teacher.reductionReason || ''
    },
    homeroom: homeroom ? {
      className: homeroom.class?.name,
      grade: homeroom.class?.grade,
      reducedLessonsPerWeek: homeroom.reducedLessonsPerWeek,
      reducedWeeks: homeroom.reducedWeeks,
      totalReducedLessons: homeroom.totalReducedLessons,
      reductionReason: "GVCN"
    } : null,
    finalBasicTeachingLessons: teacher.finalBasicTeachingLessons,
    totalAssignment: teacher.totalAssignment,
    departmentName: teacher.departmentName,
    teachingSubjectsName: teacher.teachingSubjectsName,
    teachingSubjects: teacher.teachingSubjects,
    teachingDetails: teachingDetails
  };
};

const getFirstName = (fullName) => {
  const nameParts = fullName.trim().split(' ');
  return nameParts[0];
};

const getLastName = (fullName) => {
  const nameParts = fullName.trim().split(' ');
  return nameParts[nameParts.length - 1];
};

const getMiddleName = (fullName) => {
  const nameParts = fullName.trim().split(' ');
  return nameParts.slice(1, -1).join(' ');
};

const compareVietnameseStrings = (a, b) => {
  return a.localeCompare(b, 'vi', { sensitivity: 'base' });
};

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

const commonPipeline = (matchStage) => [
  { $match: matchStage },
  // Lookup để lấy thông tin về homeroom
  {
    $lookup: {
      from: 'homerooms',
      localField: '_id',
      foreignField: 'teacher',
      as: 'homeroom'
    }
  },
  { $unwind: { path: '$homeroom', preserveNullAndEmptyArrays: true } },
  // Lookup để lấy thông tin về department
  {
    $lookup: {
      from: 'departments',
      localField: 'department',
      foreignField: '_id',
      as: 'departmentInfo'
    }
  },
  { $unwind: '$departmentInfo' },
  // Lookup để lấy thông tin về teaching subjects
  {
    $lookup: {
      from: 'subjects',
      localField: 'teachingSubjects',
      foreignField: '_id',
      as: 'subjectInfo'
    }
  },
  {
    $addFields: {
      homeroomReduction: {
        $cond: [
          { $ifNull: ['$homeroom', false] },
          {
            className: '$homeroom.class.name',
            reducedLessonsPerWeek: { $ifNull: ['$homeroom.reducedLessonsPerWeek', 0] },
            reducedWeeks: { $ifNull: ['$homeroom.reducedWeeks', 0] },
            totalReducedLessons: { $ifNull: ['$homeroom.totalReducedLessons', 0] },
            reductionReason: 'GVCN'
          },
          null
        ]
      },
      finalBasicTeachingLessons: {
        $let: {
          vars: {
            totalReduction: { 
              $add: [
                { $ifNull: ['$totalReducedLessons', 0] },
                { $ifNull: ['$homeroom.totalReducedLessons', 0] }
              ]
            }
          },
          in: { $max: [0, { $subtract: ['$basicTeachingLessons', '$$totalReduction'] }] }
        }
      },
      departmentName: '$departmentInfo.name',
      teachingSubjectsName: {
        $ifNull: [
          { $first: '$subjectInfo.name' },
          null
        ]
      }
    }
  }
];

statisticsRouter.get('/teacher-details', isAuth, async (req, res) => {
  try {
    const teachers = await Teacher.aggregate([
      {
        $lookup: {
          from: 'departments',
          localField: 'department',
          foreignField: '_id',
          as: 'departmentInfo'
        }
      },
      {
        $unwind: '$departmentInfo'
      },
      {
        $lookup: {
          from: 'subjects',
          localField: 'teachingSubjects',
          foreignField: '_id',
          as: 'teachingSubjectsInfo'
        }
      },
      {
        $unwind: {
          path: '$teachingSubjectsInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'homerooms',
          localField: '_id',
          foreignField: 'teacher',
          as: 'homeroomInfo'
        }
      },
      {
        $unwind: {
          path: '$homeroomInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'classes',
          localField: 'homeroomInfo.class',
          foreignField: '_id',
          as: 'homeroomClassInfo'
        }
      },
      {
        $unwind: {
          path: '$homeroomClassInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'teacherassignments',
          let: { teacherId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$teacher', '$$teacherId'] }
              }
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
                _id: 1,
                completedLessons: 1,
                lessonsPerWeek: 1,
                numberOfWeeks: 1,
                class: {
                  _id: '$classInfo._id',
                  name: '$classInfo.name',
                  grade: '$classInfo.grade',
                  campus: '$classInfo.campus',
                  size: '$classInfo.size'
                },
                subject: {
                  _id: '$subjectInfo._id',
                  name: '$subjectInfo.name',
                  isSpecialized: '$subjectInfo.isSpecialized'
                }
              }
            }
          ],
          as: 'assignments'
        }
      },
      {
        $addFields: {
          homeroomAssignment: {
            $cond: {
              if: { $ifNull: ['$homeroomInfo', false] },
              then: [{
                _id: { $toString: '$_id' },
                completedLessons: 36,
                lessonsPerWeek: 2,
                numberOfWeeks: 18,
                class: {
                  _id: '$homeroomClassInfo._id',
                  name: '$homeroomClassInfo.name',
                  grade: '$homeroomClassInfo.grade',
                  campus: '$homeroomClassInfo.campus',
                  size: '$homeroomClassInfo.size'
                },
                subject: {
                  name: 'CCSHL',
                  isSpecialized: false
                }
              }],
              else: []
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          email: 1,
          name: 1,
          phone: 1,
          position: 1,
          type: 1,
          teachingSubjects: '$teachingSubjectsInfo.name',
          assignments: { $concatArrays: ['$assignments', '$homeroomAssignment'] }
        }
      },
      {
        $sort: {
          name: 1
        }
      }
    ]);

    const sortedTeachers = sortTeachersByName(teachers);

    res.status(200).json({
      count: sortedTeachers.length,
      teachers: sortedTeachers
    });
  } catch (error) {
    console.error('Error in getting teacher details:', error);
    res.status(500).json({ 
      message: 'Lỗi server khi lấy thông tin chi tiết giáo viên',
      error: error.message 
    });
  }
});

statisticsRouter.get('/department-teachers', isAuth, async (req, res) => {
  try {
    // Lấy thông tin user từ token
    const user = await User.findById(req.user._id).populate('teacher');
    if (!user || user.role !== 0) {
      return res.status(403).json({ message: 'Chỉ tổ trưởng mới có quyền truy cập thông tin này' });
    }

    // Lấy thông tin teacher để xác định department
    const teacher = await Teacher.findOne({ email: user.email });

    // Query tất cả giáo viên trong department
    const teachers = await Teacher.aggregate([
      {
        $match: { department: teacher.department }
      },
      {
        // Lookup thông tin department
        $lookup: {
          from: 'departments',
          localField: 'department',
          foreignField: '_id',
          as: 'departmentInfo'
        }
      },
      {
        $unwind: '$departmentInfo'
      },
      {
        // Lookup thông tin homeroom
        $lookup: {
          from: 'homerooms',
          localField: '_id',
          foreignField: 'teacher',
          as: 'homeroom'
        }
      },
      {
        $unwind: {
          path: '$homeroom',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        // Lookup thông tin class cho homeroom
        $lookup: {
          from: 'classes',
          localField: 'homeroom.class',
          foreignField: '_id',
          as: 'homeroomClass'
        }
      },
      {
        $unwind: {
          path: '$homeroomClass',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        // Thêm các trường được tính toán
        $addFields: {
          departmentName: '$departmentInfo.name',
          homeroomInfo: {
            $cond: [
              { $ifNull: ['$homeroom', false] },
              {
                className: '$homeroomClass.name',
                grade: '$homeroomClass.grade',
                reducedLessonsPerWeek: { $ifNull: ['$homeroom.reducedLessonsPerWeek', 0] },
                reducedWeeks: { $ifNull: ['$homeroom.reducedWeeks', 0] },
                totalReducedLessons: { $ifNull: ['$homeroom.totalReducedLessons', 0] },
                reductionReason: 'GVCN'
              },
              null
            ]
          },
          // Tách tên thành các phần để sắp xếp
          nameParts: {
            $let: {
              vars: {
                nameParts: { $split: ['$name', ' '] }
              },
              in: {
                firstName: { $arrayElemAt: ['$$nameParts', 0] },
                lastName: { $arrayElemAt: ['$$nameParts', { $subtract: [{ $size: '$$nameParts' }, 1] }] },
                middleName: {
                  $reduce: {
                    input: { $slice: ['$$nameParts', 1, { $subtract: [{ $size: '$$nameParts' }, 2] }] },
                    initialValue: '',
                    in: { $concat: ['$$value', ' ', '$$this'] }
                  }
                }
              }
            }
          }
        }
      },
      {
        // Sắp xếp theo họ, tên đệm, tên
        $sort: {
          'nameParts.lastName': 1,
          'nameParts.middleName': 1,
          'nameParts.firstName': 1
        }
      },
      {
        // Project để loại bỏ các trường không cần thiết
        $project: {
          _id: 1,
          name: 1,
          type: 1,
          lessonsPerWeek: 1,
          teachingWeeks: 1,
          basicTeachingLessons: 1,
          totalReducedLessons: 1,
          totalAssignment: 1,
          departmentName: 1,
          teachingSubjects: 1,
          homeroomInfo: 1,
          reducedLessonsPerWeek: 1,
          reducedWeeks: 1,
          reductionReason: 1
        }
      }
    ]);

    // Xử lý chi tiết giảng dạy cho mỗi giáo viên
    const teachersData = await Promise.all(teachers.map(async (teacher) => {
      const assignments = await TeacherAssignment.find({ teacher: teacher._id })
        .populate('class', 'name grade')
        .populate('subject', 'name');

      const teachingDetails = assignments.map(assignment => ({
        className: assignment.class?.name,
        grade: assignment.class?.grade,
        subject: assignment.subject?.name,
        completedLessons: assignment.completedLessons
      }));

      return {
        ...teacher,
        teachingDetails
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
    const teachers = await Teacher.aggregate([
      {
        $lookup: {
          from: 'departments',
          localField: 'department',
          foreignField: '_id',
          as: 'departmentInfo'
        }
      },
      {
        $lookup: {
          from: 'subjects',
          localField: 'teachingSubjects',
          foreignField: '_id',
          as: 'subjectInfo'
        }
      },
      {
        $lookup: {
          from: 'teacherassignments',
          let: { teacherId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$teacher', '$$teacherId'] } } },
            {
              $lookup: {
                from: 'classes',
                localField: 'class',
                foreignField: '_id',
                as: 'classInfo'
              }
            },
            { $unwind: '$classInfo' },
            {
              $lookup: {
                from: 'subjects',
                localField: 'subject',
                foreignField: '_id',
                as: 'subjectInfo'
              }
            },
            { $unwind: '$subjectInfo' },
            {
              $project: {
                campus: '$classInfo.campus',
                isSpecialized: '$subjectInfo.isSpecialized',
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
            }
          ],
          as: 'assignments'
        }
      },
      {
        $addFields: {
          totalLessonsQ5S: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$assignments',
                    as: 'assignment',
                    cond: {
                      $and: [
                        { $eq: ['$$assignment.campus', 'Quận 5'] },
                        { $eq: ['$$assignment.isSpecialized', true] }
                      ]
                    }
                  }
                },
                as: 'filteredAssignment',
                in: '$$filteredAssignment.lessonCount.lessonCount'
              }
            }
          },
          totalLessonsQ5NS: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$assignments',
                    as: 'assignment',
                    cond: {
                      $and: [
                        { $eq: ['$$assignment.campus', 'Quận 5'] },
                        { $eq: ['$$assignment.isSpecialized', false] }
                      ]
                    }
                  }
                },
                as: 'filteredAssignment',
                in: '$$filteredAssignment.lessonCount.lessonCount'
              }
            }
          },
          totalLessonsTDS: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$assignments',
                    as: 'assignment',
                    cond: {
                      $and: [
                        { $eq: ['$$assignment.campus', 'Thủ Đức'] },
                        { $eq: ['$$assignment.isSpecialized', true] }
                      ]
                    }
                  }
                },
                as: 'filteredAssignment',
                in: '$$filteredAssignment.lessonCount.lessonCount'
              }
            }
          },
          totalLessonsTDNS: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$assignments',
                    as: 'assignment',
                    cond: {
                      $and: [
                        { $eq: ['$$assignment.campus', 'Thủ Đức'] },
                        { $eq: ['$$assignment.isSpecialized', false] }
                      ]
                    }
                  }
                },
                as: 'filteredAssignment',
                in: '$$filteredAssignment.lessonCount.lessonCount'
              }
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          type: 1,
          lessonsPerWeek: 1,
          teachingWeeks: 1,
          basicTeachingLessons: 1,
          totalReducedLessons: 1,
          totalAssignment: 1,
          departmentName: { $arrayElemAt: ['$departmentInfo.name', 0] },
          teachingSubjects: { $arrayElemAt: ['$subjectInfo.name', 0] },
          totalLessonsQ5S: 1,
          totalLessonsQ5NS: 1,
          totalLessonsTDS: 1,
          totalLessonsTDNS: 1,
          reducedLessonsPerWeek: 1,
          reducedWeeks: 1,
          reductionReason: 1
        }
      }
    ]);

    const sortedTeachers = sortTeachersByName(teachers);
    
    const teachersData = await Promise.all(sortedTeachers.map(async (teacher) => {
      const teacherData = await getTeacherDataWithReductions(teacher);
      return {
        ...teacherData,
        totalLessonsQ5S: teacher.totalLessonsQ5S || 0,
        totalLessonsQ5NS: teacher.totalLessonsQ5NS || 0,
        totalLessonsTDS: teacher.totalLessonsTDS || 0,
        totalLessonsTDNS: teacher.totalLessonsTDNS || 0,
        reducedLessonsPerWeek: teacher.reducedLessonsPerWeek || 0,
        reducedWeeks: teacher.reducedWeeks || 0,
        reductionReason: teacher.reductionReason || ''
      };
    }));
    
    res.status(200).json(teachersData);
  } catch (error) {
    console.error('Error in getting all teachers:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
}); 

// Endpoint cho teachers below basic
statisticsRouter.get('/teachers-below-basic', isAuth, async (req, res) => {
  try {
    const { departmentId } = req.query;
    let matchStage = departmentId ? { department: new mongoose.Types.ObjectId(departmentId) } : {};

    const pipeline = [
      ...commonPipeline(matchStage),
      {
        $match: {
          $expr: { $lt: ['$totalAssignment', '$finalBasicTeachingLessons'] }
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          type: 1,
          lessonsPerWeek: 1,
          teachingWeeks: 1,
          basicTeachingLessons: 1,
          totalReducedLessons: 1,
          totalAssignment: 1,
          departmentName: 1,
          teachingSubjectsName: 1,
          homeroomReduction: 1,
          finalBasicTeachingLessons: 1,
          reducedLessonsPerWeek: 1,
          reducedWeeks: 1,
          reductionReason: 1
        }
      }
    ];

    const teachersData = await Teacher.aggregate(pipeline);
    
    const fullTeachersData = await Promise.all(
      teachersData.map(teacher => getTeacherDataWithReductions(teacher))
    );

    const sortedTeachers = sortTeachersByName(fullTeachersData);

    res.status(200).json(sortedTeachers);
  } catch (error) {
    console.error('Error in getting teachers below basic lessons:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Endpoint cho teachers above threshold
statisticsRouter.get('/teachers-above-threshold', isAuth, async (req, res) => {
  try {
    const { departmentId } = req.query;
    let matchStage = departmentId ? { department: new mongoose.Types.ObjectId(departmentId) } : {};

    const pipeline = [
      ...commonPipeline(matchStage),
      {
        $match: {
          $expr: {
            $gt: [
              { $subtract: ['$totalAssignment', '$finalBasicTeachingLessons'] },
              { $multiply: ['$finalBasicTeachingLessons', 0.25] }
            ]
          }
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          type: 1,
          lessonsPerWeek: 1,
          teachingWeeks: 1,
          basicTeachingLessons: 1,
          totalReducedLessons: 1,
          totalAssignment: 1,
          departmentName: 1,
          teachingSubjectsName: 1,
          homeroomReduction: 1,
          finalBasicTeachingLessons: 1,
          reducedLessonsPerWeek: 1,
          reducedWeeks: 1,
          reductionReason: 1
        }
      }
    ];

    const teachersData = await Teacher.aggregate(pipeline);
    
    const fullTeachersData = await Promise.all(
      teachersData.map(teacher => getTeacherDataWithReductions(teacher))
    );

    const sortedTeachers = sortTeachersByName(fullTeachersData);

    res.status(200).json(sortedTeachers);
  } catch (error) {
    console.error('Error in getting teachers above threshold:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

statisticsRouter.get('/all-teachers-below-basic', isAuth, isAdmin, async (req, res) => {
  try {
    const excludedDepartment = await Department.findOne({ name: "Tổ Giáo vụ – Đào tạo" });
    const teachers = await Teacher.find({
      department: { $ne: excludedDepartment ? excludedDepartment._id : null }
    })
    .select('name type lessonsPerWeek teachingWeeks basicTeachingLessons totalReducedLessons totalAssignment')
    .populate('department', 'name');

    const teachersData = await Promise.all(teachers.map(getTeacherDataWithReductions));
    
    const filteredTeachersData = teachersData.filter(teacher => 
      teacher.totalAssignment < teacher.finalBasicTeachingLessons
    );

    // Áp dụng sắp xếp theo tên tiếng Việt
    const sortedTeachers = sortTeachersByName(filteredTeachersData);

    res.status(200).json(sortedTeachers);
  } catch (error) {
    console.error('Error in getting all teachers below basic:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

statisticsRouter.get('/all-teachers-above-threshold', isAuth, isAdmin, async (req, res) => {
  try {
    const excludedDepartment = await Department.findOne({ name: "Tổ Giáo vụ – Đào tạo" });
    const teachers = await Teacher.find({
      department: { $ne: excludedDepartment ? excludedDepartment._id : null }
    })
    .select('name type lessonsPerWeek teachingWeeks basicTeachingLessons totalReducedLessons totalAssignment')
    .populate('department', 'name');

    const teachersData = await Promise.all(teachers.map(getTeacherDataWithReductions));
    
    const filteredTeachersData = teachersData.filter(teacher => {
      const excessLessons = teacher.totalAssignment - teacher.finalBasicTeachingLessons;
      return excessLessons > teacher.finalBasicTeachingLessons * 0.25;
    });

    // Áp dụng sắp xếp theo tên tiếng Việt
    const sortedTeachers = sortTeachersByName(filteredTeachersData);

    res.status(200).json(sortedTeachers);
  } catch (error) {
    console.error('Error in getting all teachers above threshold:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

statisticsRouter.get('/department-teachers/:departmentId', isAuth, isAdmin, async (req, res) => {
  try {
    const { departmentId } = req.params;

    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({ message: 'Không tìm thấy khoa' });
    }

    const teachers = await Teacher.find({ department: departmentId })
      .select('name type lessonsPerWeek teachingWeeks basicTeachingLessons totalReducedLessons totalAssignment');
    
    const teachersData = await Promise.all(teachers.map(getTeacherDataWithReductions));

    // Áp dụng sắp xếp theo tên tiếng Việt
    const sortedTeachers = sortTeachersByName(teachersData);

    res.status(200).json(sortedTeachers);
  } catch (error) {
    console.error('Error in getting department teachers:', error);
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
          lessonsPerWeek: '$lessonsPerWeek',
          numberOfWeeks: '$numberOfWeeks',
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
          lessonsPerWeek: 1,
          numberOfWeeks: 1,
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
        declaredLessons: assignment.declaredLessons,
        lessonsPerWeek: assignment.lessonsPerWeek || 0, // Thêm trường mới
        numberOfWeeks: assignment.numberOfWeeks || 0 // Thêm trường mới
      }))
    };

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in getting teacher assignments:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

statisticsRouter.get('/all-classes', isAuth, async (req, res) => {
  try {
    const homeroomAssignments = await Homeroom.find()
      .select('teacher class')
      .populate('teacher', 'name')
      .populate('class', '_id')
      .lean();

    const homeroomTeacherMap = homeroomAssignments.reduce((acc, assignment) => {
      if (assignment.teacher?.name && assignment.class?._id) {
        acc[assignment.class._id.toString()] = assignment.teacher.name;
      }
      return acc;
    }, {});

    const classes = await Class.find()
      .select('name grade subjects')
      .populate({
        path: 'subjects.subject',
        select: 'name',
        populate: {
          path: 'department',
          select: 'name'
        }
      })
      .lean();

    const classesWithExtraInfo = classes.map(classItem => ({
      ...classItem,
      homeroomTeacher: classItem._id ? homeroomTeacherMap[classItem._id.toString()] || null : null,
      subjects: (classItem.subjects || []).concat(
        homeroomTeacherMap[classItem._id.toString()] ? [{
          subject: {
            name: "CCSHL"
          },
          lessonCount: 72
        }] : []
      )
    }));

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
            },
            {
              $project: {
                teacherId: '$teacher',
                teacherName: '$teacherInfo.name',
                assignedLessons: '$completedLessons'
              }
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
        $group: {
          _id: {
            subjectId: '$_id.subjectId',
            subjectName: '$_id.subjectName'
          },
          classes: {
            $push: {
              classId: '$_id.classId',
              className: '$_id.className',
              grade: '$_id.grade',
              declaredLessons: '$declaredLessons.lessonCount',
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

    const homeroomAssignment = await Homeroom.findOne({ class: classId })
      .select('teacher')
      .populate('teacher', 'name')
      .lean();
    
    const homeroomTeacher = homeroomAssignment?.teacher?.name || null;

    const classData = await Class.findById(classId)
      .select('name grade subjects')
      .populate({
        path: 'subjects.subject',
        select: 'name'
      })
      .lean();

    if (!classData) {
      return res.status(404).json({ message: "Không tìm thấy lớp học với ID đã cung cấp" });
    }

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
            },
            {
              $project: {
                teacherId: '$teacher',
                teacherName: '$teacherInfo.name',
                assignedLessons: '$completedLessons'
              }
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
        $group: {
          _id: {
            subjectId: '$_id.subjectId',
            subjectName: '$_id.subjectName'
          },
          classes: {
            $push: {
              classId: '$_id.classId',
              className: '$_id.className',
              grade: '$_id.grade',
              declaredLessons: '$declaredLessons.lessonCount',
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
          totalAssignmentTime: { $sum: '$assignments.completedLessons' },
          declaredTeachingLessons: { $sum: '$teachers.basicTeachingLessons' },
          teacherCount: { $size: '$teachers' },
          teachersWithDeclarations: {
            $size: {
              $filter: {
                input: '$teachers',
                as: 'teacher',
                cond: { $gt: ['$$teacher.totalAssignment', 0] }
              }
            }
          },
          teachersAboveThreshold: {
            $size: {
              $filter: {
                input: '$teachers',
                as: 'teacher',
                cond: {
                  $let: {
                    vars: {
                      finalBasicLessons: {
                        $max: [
                          0,
                          { $subtract: ['$$teacher.basicTeachingLessons', { $ifNull: ['$$teacher.totalReducedLessons', 0] }] }
                        ]
                      }
                    },
                    in: {
                      $gt: [
                        { $subtract: ['$$teacher.totalAssignment', '$$finalBasicLessons'] },
                        { $multiply: ['$$finalBasicLessons', 0.25] }
                      ]
                    }
                  }
                }
              }
            }
          },
          teachersBelowBasic: {
            $size: {
              $filter: {
                input: '$teachers',
                as: 'teacher',
                cond: {
                  $let: {
                    vars: {
                      finalBasicLessons: {
                        $max: [
                          0,
                          { $subtract: ['$$teacher.basicTeachingLessons', { $ifNull: ['$$teacher.totalReducedLessons', 0] }] }
                        ]
                      }
                    },
                    in: {
                      $lt: ['$$teacher.totalAssignment', '$$finalBasicLessons']
                    }
                  }
                }
              }
            }
          }
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

export default statisticsRouter;