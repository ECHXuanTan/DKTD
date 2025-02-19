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
              $addFields: {
                subjectDetails: {
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
                _id: 1,
                completedLessons: 1,
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
                },
                lessonsPerWeek: { $ifNull: [
                  '$lessonsPerWeek',
                  { $round: [{ $divide: ['$completedLessons', '$subjectDetails.numberOfWeeks'] }, 1] }
                ]},
                numberOfWeeks: { $ifNull: ['$numberOfWeeks', '$subjectDetails.numberOfWeeks'] }
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

statisticsRouter.get('/department-teacher-details', isAuth, async (req, res) => {
  try {
    // First find the teacher and their department based on authenticated user's email
    const currentTeacher = await Teacher.findOne({ email: req.user.email });
    
    if (!currentTeacher) {
      return res.status(404).json({
        message: 'Không tìm thấy thông tin giáo viên với email này'
      });
    }

    const teachers = await Teacher.aggregate([
      // Filter by department
      {
        $match: {
          department: currentTeacher.department
        }
      },
      // Rest of the aggregation pipeline remains identical
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
              $addFields: {
                subjectDetails: {
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
                _id: 1,
                completedLessons: 1,
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
                },
                lessonsPerWeek: { $ifNull: [
                  '$lessonsPerWeek',
                  { $round: [{ $divide: ['$completedLessons', '$subjectDetails.numberOfWeeks'] }, 1] }
                ]},
                numberOfWeeks: { $ifNull: ['$numberOfWeeks', '$subjectDetails.numberOfWeeks'] }
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
    console.error('Error in getting department teacher details:', error);
    res.status(500).json({ 
      message: 'Lỗi server khi lấy thông tin chi tiết giáo viên trong tổ/khoa',
      error: error.message 
    });
  }
});

statisticsRouter.get('/department-classes-remaining-lessons', isAuth, async (req, res) => {
  try {
    // Get user info from token
    const user = await User.findById(req.user._id).populate('teacher');
    if (!user || user.role !== 0) {
      return res.status(403).json({ message: 'Chỉ tổ trưởng mới có quyền truy cập thông tin này' });
    }

    // Get teacher info to determine department
    const teacher = await Teacher.findOne({ email: user.email });
    if (!teacher) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin giáo viên' });
    }

    // Get subjects in the department
    const departmentSubjects = await Subject.find({ department: teacher.department })
      .select('_id')
      .lean();
    
    const subjectIds = departmentSubjects.map(subject => subject._id);

    // Get assignments for these subjects
    const assignments = await TeacherAssignment.aggregate([
      {
        $match: {
          subject: { $in: subjectIds }
        }
      },
      {
        $group: {
          _id: {
            classId: '$class',
            subjectId: '$subject'
          },
          totalAssignedLessons: { $sum: '$completedLessons' }
        }
      }
    ]);

    // Create assignments map for quick lookup
    const assignmentsMap = assignments.reduce((acc, curr) => {
      const key = `${curr._id.classId}-${curr._id.subjectId}`;
      acc[key] = curr.totalAssignedLessons;
      return acc;
    }, {});

    // Get classes with subjects from department
    const classes = await Class.find({
      'subjects.subject': { $in: subjectIds }
    })
    .select('name subjects')
    .populate({
      path: 'subjects.subject',
      select: 'name'
    })
    .lean();

    // Calculate remaining lessons for each class
    const classesWithRemainingLessons = classes.map(classItem => {
      let totalRemainingLessons = 0;

      // Calculate total remaining lessons across all subjects
      classItem.subjects.forEach(subject => {
        if (subjectIds.some(id => id.equals(subject.subject._id))) {
          const assignmentKey = `${classItem._id}-${subject.subject._id}`;
          const assignedLessons = assignmentsMap[assignmentKey] || 0;
          const remainingLessons = subject.lessonCount - assignedLessons;
          totalRemainingLessons += remainingLessons;
        }
      });

      return {
        name: classItem.name,
        remainingLessons: totalRemainingLessons
      };
    });

    // Filter out classes with no remaining lessons and sort by name
    const filteredClasses = classesWithRemainingLessons
      .filter(c => c.remainingLessons > 0)
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));

    res.status(200).json(filteredClasses);
  } catch (error) {
    console.error('Error in GET /department-classes-remaining-lessons:', error);
    res.status(500).json({ 
      message: "Lỗi khi lấy thông tin số tiết trống", 
      error: error.message 
    });
  }
});

statisticsRouter.get('/export-department-teachers', isAuth, async (req, res) => {
  try {
    // Get user info from token
    const user = await User.findById(req.user._id).populate('teacher');
    if (!user || user.role !== 0) {
      return res.status(403).json({ message: 'Chỉ tổ trưởng mới có quyền truy cập thông tin này' });
    }

    // Get teacher info to determine department
    const teacher = await Teacher.findOne({ email: user.email });

    const teachers = await Teacher.aggregate([
      {
        $match: { department: teacher.department }
      },
      {
        $lookup: {
          from: 'teacherassignments',
          let: { teacherId: '$_id' },
          pipeline: [
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
                completedLessons: 1,
                lessonsPerWeek: 1,
                numberOfWeeks: 1,
                class: {
                  name: '$classInfo.name',
                  size: '$classInfo.size'
                },
                subject: {
                  name: '$subjectInfo.name'
                }
              }
            }
          ],
          as: 'assignments'
        }
      },
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
        $addFields: {
          homeroomAssignment: {
            $cond: {
              if: { $ifNull: ['$homeroom', false] },
              then: [{
                campus: '$homeroomClass.campus',
                isSpecialized: false,
                completedLessons: 36,
                lessonsPerWeek: 2,
                numberOfWeeks: 18,
                class: {
                  name: '$homeroomClass.name',
                  size: '$homeroomClass.size'
                },
                subject: {
                  name: 'CCSHL'
                }
              }],
              else: []
            }
          }
        }
      },
      {
        $addFields: {
          allAssignments: { $concatArrays: ['$assignments', '$homeroomAssignment'] }
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          type: 1,
          basicTeachingLessons: 1,
          totalReducedLessons: 1,
          totalAssignment: 1,
          departmentName: '$departmentInfo.name',
          teachingSubjects: 1,
          assignments: '$allAssignments',
          reductionReason: 1
        }
      }
    ]);

    const sortedTeachers = sortTeachersByName(teachers);

    res.status(200).json({
      count: sortedTeachers.length,
      teachers: sortedTeachers
    });
  } catch (error) {
    console.error('Error in getting export department teachers:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

statisticsRouter.get('/department-teachers', isAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('teacher');
    if (!user || user.role !== 0) {
      return res.status(403).json({ message: 'Chỉ tổ trưởng mới có quyền truy cập thông tin này' });
    }
 
    const teacher = await Teacher.findOne({ email: user.email });
 
    const teachers = await Teacher.aggregate([
      {
        $match: { department: teacher.department }
      },
      {
        $lookup: {
          from: 'departments',
          localField: 'department',
          foreignField: '_id',
          as: 'departmentInfo'
        }
      },
      { $unwind: '$departmentInfo' },
      {
        $lookup: {
          from: 'subjects',
          localField: 'teachingSubjects',
          foreignField: '_id',
          as: 'teachingSubjectsInfo'
        }
      },
      {
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
        $addFields: {
          departmentName: '$departmentInfo.name',
          teachingSubjects: '$teachingSubjectsInfo.name',
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
          totalReducedLessons: {
            $reduce: {
              input: { $ifNull: ['$reductions', []] },
              initialValue: 0,
              in: { $add: ['$$value', '$$this.reducedLessons'] }
            }
          },
          totalReductions: {
            $add: [
              {
                $reduce: {
                  input: { $ifNull: ['$reductions', []] },
                  initialValue: 0,
                  in: { $add: ['$$value', '$$this.reducedLessons'] }
                }
              },
              { $ifNull: ['$homeroom.totalReducedLessons', 0] }
            ]
          },
          finalBasicTeachingLessons: {
            $max: [
              0,
              {
                $subtract: [
                  '$basicTeachingLessons',
                  {
                    $add: [
                      {
                        $reduce: {
                          input: { $ifNull: ['$reductions', []] },
                          initialValue: 0,
                          in: { $add: ['$$value', '$$this.reducedLessons'] }
                        }
                      },
                      { $ifNull: ['$homeroom.totalReducedLessons', 0] }
                    ]
                  }
                ]
              }
            ]
          },
          nameParts: {
            $let: {
              vars: {
                nameParts: { $split: ['$name', ' '] }
              },
              in: {
                firstName: { $arrayElemAt: ['$$nameParts', 0] },
                lastName: { $arrayElemAt: ['$$nameParts', { $subtract: [{ $size: '$$nameParts' }, 1] }] },
                middleName: {
                  $cond: {
                    if: { $gt: [{ $size: '$$nameParts' }, 2] },
                    then: {
                      $reduce: {
                        input: { $slice: ['$$nameParts', 1, { $subtract: [{ $size: '$$nameParts' }, 2] }] },
                        initialValue: '',
                        in: {
                          $cond: {
                            if: { $eq: ['$$value', ''] },
                            then: '$$this',
                            else: { $concat: ['$$value', ' ', '$$this'] }
                          }
                        }
                      }
                    },
                    else: ''
                  }
                }
              }
            }
          }
        }
      },
      {
        $sort: {
          'nameParts.lastName': 1,
          'nameParts.middleName': 1,
          'nameParts.firstName': 1
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
          reductions: 1,
          totalReducedLessons: 1,
          totalAssignment: 1,
          departmentName: 1,
          teachingSubjects: 1,
          homeroomInfo: 1,
          declaredTeachingLessons: 1,
          totalReductions: 1,
          finalBasicTeachingLessons: 1
        }
      }
    ]);
 
    const teachersData = await Promise.all(teachers.map(async (teacher) => {
      const assignments = await TeacherAssignment.find({ teacher: teacher._id })
        .populate({
          path: 'class',
          select: 'name grade subjects campus',
          populate: {
            path: 'subjects.subject',
            select: 'name isSpecialized'
          }
        })
        .populate('subject', 'name isSpecialized')
        .lean();
 
      const teachingDetails = assignments.map(assignment => {
        const subjectInClass = assignment.class.subjects.find(s => 
          s.subject._id.toString() === assignment.subject._id.toString()
        );
 
        return {
          id: assignment._id,
          className: assignment.class?.name,
          grade: assignment.class?.grade,
          subject: assignment.subject?.name,
          completedLessons: assignment.completedLessons,
          classId: assignment.class?._id,
          subjectId: assignment.subject?._id,
          teacherId: teacher._id,
          totalLessons: subjectInClass ? subjectInClass.lessonCount : 0,
          campus: assignment.class?.campus,
          isSpecialized: assignment.subject?.isSpecialized,
          declaredLessons: assignment.subject?.isSpecialized ? 
            assignment.completedLessons * 3 : 
            assignment.completedLessons
        };
      });
 
      const totalFromTeaching = teachingDetails.reduce((sum, detail) => sum + detail.completedLessons, 0);
      const homeroomLessons = teacher.homeroomInfo ? 36 : 0;
 
      return {
        ...teacher,
        teachingDetails,
        totalAssignment: totalFromTeaching + homeroomLessons,
        declaredTeachingLessons: teachingDetails.reduce((sum, detail) => sum + detail.declaredLessons, 0)
      };
    }));
 
    res.status(200).json(teachersData);
  } catch (error) {
    console.error('Error in getting department teachers:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
 });

statisticsRouter.get('/department-teachers/:departmentId', isAuth, async (req, res) => {
  try {
    const { departmentId } = req.params;

    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({ message: 'Không tìm thấy tổ bộ môn' });
    }

    const teachers = await Teacher.aggregate([
      {
        $match: { department: new mongoose.Types.ObjectId(departmentId) }
      },
      {
        $lookup: {
          from: 'departments',
          localField: 'department',
          foreignField: '_id',
          as: 'departmentInfo'
        }
      },
      { $unwind: '$departmentInfo' },
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
        $addFields: {
          departmentName: '$departmentInfo.name',
          teachingSubjects: '$teachingSubjectsInfo.name',
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
          totalReductions: {
            $add: [
              { $ifNull: ['$totalReducedLessons', 0] },
              { $ifNull: ['$homeroom.totalReducedLessons', 0] }
            ]
          },
          finalBasicTeachingLessons: {
            $max: [
              0,
              {
                $subtract: [
                  '$basicTeachingLessons',
                  {
                    $add: [
                      { $ifNull: ['$totalReducedLessons', 0] },
                      { $ifNull: ['$homeroom.totalReducedLessons', 0] }
                    ]
                  }
                ]
              }
            ]
          },
          nameParts: {
            $let: {
              vars: {
                nameParts: { $split: ['$name', ' '] }
              },
              in: {
                firstName: { $arrayElemAt: ['$$nameParts', 0] },
                lastName: { $arrayElemAt: ['$$nameParts', { $subtract: [{ $size: '$$nameParts' }, 1] }] },
                middleName: {
                  $cond: {
                    if: { $gt: [{ $size: '$$nameParts' }, 2] },
                    then: {
                      $reduce: {
                        input: { $slice: ['$$nameParts', 1, { $subtract: [{ $size: '$$nameParts' }, 2] }] },
                        initialValue: '',
                        in: { $concat: [{ $cond: [{ $eq: ['$$value', ''] }, '', { $concat: ['$$value', ' '] }] }, '$$this'] }
                      }
                    },
                    else: ''
                  }
                }
              }
            }
          }
        }
      },
      {
        $sort: {
          'nameParts.lastName': 1,
          'nameParts.middleName': 1,
          'nameParts.firstName': 1
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
          teachingSubjects: 1,
          homeroomInfo: 1,
          declaredTeachingLessons: 1,
          reducedLessonsPerWeek: 1,
          reducedWeeks: 1,
          reductionReason: 1,
          totalReductions: 1,
          finalBasicTeachingLessons: 1
        }
      }
    ]);

    const teachersData = await Promise.all(teachers.map(async (teacher) => {
      const assignments = await TeacherAssignment.find({ teacher: teacher._id })
        .populate('class', 'name grade')
        .populate({
          path: 'subject',
          select: 'name isSpecialized'
        })
        .select('class subject completedLessons lessonsPerWeek numberOfWeeks');

      const teachingDetails = assignments.map(assignment => ({
        _id: assignment._id,
        className: assignment.class?.name,
        grade: assignment.class?.grade,
        subject: assignment.subject?.name,
        completedLessons: assignment.completedLessons,
        lessonsPerWeek: assignment.lessonsPerWeek,
        numberOfWeeks: assignment.numberOfWeeks,
        declaredLessons: assignment.subject?.isSpecialized ? 
          assignment.completedLessons * 3 : 
          assignment.completedLessons
      }));

      return {
        ...teacher,
        teachingDetails
      };
    }));

    res.status(200).json(teachersData);
  } catch (error) {
    console.error('Error in getting department teachers by ID:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

statisticsRouter.get('/export-department-teachers/:departmentId', isAuth, async (req, res) => {
  try {
    const { departmentId } = req.params;
 
    const teachers = await Teacher.aggregate([
      {
        $match: { department: new mongoose.Types.ObjectId(departmentId) }
      },
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
          from: 'homerooms',
          localField: '_id',
          foreignField: 'teacher', 
          as: 'homeroomInfo'
        }
      },
      {
        $lookup: {
          from: 'classes',
          localField: 'homeroomInfo.class',
          foreignField: '_id',
          as: 'homeroomClass'
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
                completedLessons: 1,
                className: '$classInfo.name',
                subject: '$subjectInfo.name',
                grade: '$classInfo.grade'
              }
            }
          ],
          as: 'assignments'
        }
      },
      {
        $addFields: {
          totalReducedLessons: {
            $reduce: {
              input: { $ifNull: ['$reductions', []] },
              initialValue: 0,
              in: { $add: ['$$value', '$$this.reducedLessons'] }
            }
          },
          hasHomeroom: { $gt: [{ $size: '$homeroomInfo' }, 0] },
          homeroomReduction: {
            $cond: {
              if: { $gt: [{ $size: '$homeroomInfo' }, 0] },
              then: {
                className: { $arrayElemAt: ['$homeroomClass.name', 0] },
                grade: { $arrayElemAt: ['$homeroomClass.grade', 0] },
                reducedLessonsPerWeek: { $ifNull: [{ $arrayElemAt: ['$homeroomInfo.reducedLessonsPerWeek', 0] }, 0] },
                reducedWeeks: { $ifNull: [{ $arrayElemAt: ['$homeroomInfo.reducedWeeks', 0] }, 0] },
                totalReducedLessons: { $ifNull: [{ $arrayElemAt: ['$homeroomInfo.totalReducedLessons', 0] }, 0] },
                reductionReason: 'GVCN'
              },
              else: null
            }
          },
          totalReductions: {
            $add: [
              {
                $reduce: {
                  input: { $ifNull: ['$reductions', []] },
                  initialValue: 0,
                  in: { $add: ['$$value', '$$this.reducedLessons'] }
                }
              },
              { $ifNull: [{ $arrayElemAt: ['$homeroomInfo.totalReducedLessons', 0] }, 0] }
            ]
          },
          finalBasicTeachingLessons: {
            $max: [
              0,
              {
                $subtract: [
                  '$basicTeachingLessons',
                  {
                    $add: [
                      {
                        $reduce: {
                          input: { $ifNull: ['$reductions', []] },
                          initialValue: 0,
                          in: { $add: ['$$value', '$$this.reducedLessons'] }
                        }
                      },
                      { $ifNull: [{ $arrayElemAt: ['$homeroomInfo.totalReducedLessons', 0] }, 0] }
                    ]
                  }
                ]
              }
            ]
          },
          homeroomCampus: { $arrayElemAt: ['$homeroomClass.campus', 0] },
          teachingDetails: '$assignments',
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
                in: '$$filteredAssignment.completedLessons'
              }
            }
          },
          totalLessonsQ5NS: {
            $add: [
              {
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
                    in: '$$filteredAssignment.completedLessons'
                  }
                }
              },
              {
                $cond: [
                  { 
                    $and: [
                      { $gt: [{ $size: '$homeroomInfo' }, 0] },
                      { $eq: ['$homeroomCampus', 'Quận 5'] }
                    ]
                  },
                  36,
                  0
                ]
              }
            ]
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
                in: '$$filteredAssignment.completedLessons'
              }
            }
          },
          totalLessonsTDNS: {
            $add: [
              {
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
                    in: '$$filteredAssignment.completedLessons'
                  }
                }
              },
              {
                $cond: [
                  {
                    $and: [
                      { $gt: [{ $size: '$homeroomInfo' }, 0] },
                      { $eq: ['$homeroomCampus', 'Thủ Đức'] }
                    ]
                  },
                  36,
                  0
                ]
              }
            ]
          }
        }
      },
      {
        $addFields: {
          totalAssignment: {
            $add: [
              {
                $sum: {
                  $map: {
                    input: '$assignments',
                    as: 'assignment',
                    in: '$$assignment.completedLessons'
                  }
                }
              },
              {
                $cond: [
                  { $gt: [{ $size: '$homeroomInfo' }, 0] },
                  36,
                  0
                ]
              }
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
          totalAssignment: 1,
          departmentName: { $arrayElemAt: ['$departmentInfo.name', 0] },
          teachingSubjects: { $arrayElemAt: ['$subjectInfo.name', 0] },
          totalLessonsQ5S: 1,
          totalLessonsQ5NS: 1,
          totalLessonsTDS: 1,
          totalLessonsTDNS: 1,
          reductions: 1,
          totalReducedLessons: 1, 
          homeroomReduction: 1,
          totalReductions: 1,
          finalBasicTeachingLessons: 1,
          teachingDetails: 1
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
        reductions: teacher.reductions || [],
        totalReducedLessons: teacher.totalReducedLessons || 0,
        homeroomReduction: teacher.homeroomReduction,
        totalReductions: teacher.totalReductions || 0,
        finalBasicTeachingLessons: teacher.finalBasicTeachingLessons || 0,
        teachingDetails: teacher.teachingDetails || []
      };
    }));
    
    res.status(200).json(teachersData);
  } catch (error) {
    console.error('Error in getting export department teachers:', error);
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
      { $unwind: '$departmentInfo' },
      {
        $lookup: {
          from: 'subjects',
          localField: 'teachingSubjects',
          foreignField: '_id',
          as: 'teachingSubjectsInfo'
        }
      },
      {
        $lookup: {
          from: 'homerooms',
          localField: '_id',
          foreignField: 'teacher',
          as: 'homeroomDetails'
        }
      },
      {
        $lookup: {
          from: 'classes',
          localField: 'homeroomDetails.class',
          foreignField: '_id',
          as: 'homeroomClass'
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
                _id: 1,
                className: '$classInfo.name',
                grade: '$classInfo.grade',
                campus: '$classInfo.campus',
                subject: '$subjectInfo.name',
                isSpecialized: '$subjectInfo.isSpecialized',
                completedLessons: 1,
                lessonsPerWeek: 1,
                numberOfWeeks: 1,
                declaredLessons: {
                  $cond: [
                    '$subjectInfo.isSpecialized',
                    { $multiply: ['$completedLessons', 3] },
                    '$completedLessons'
                  ]
                }
              }
            }
          ],
          as: 'teachingDetails'
        }
      },
      {
        $addFields: {
          hasHomeroom: { $gt: [{ $size: '$homeroomDetails' }, 0] },
          teachingSubjects: {
            $switch: {
              branches: [
                { case: { $eq: [{ $arrayElemAt: ['$teachingSubjectsInfo.name', 0] }, "TIN HỌC"] }, then: "TIN" },
                { case: { $eq: [{ $arrayElemAt: ['$teachingSubjectsInfo.name', 0] }, "VẬT LÝ"] }, then: "LÝ" },
                { case: { $eq: [{ $arrayElemAt: ['$teachingSubjectsInfo.name', 0] }, "HÓA HỌC"] }, then: "HÓA" },
                { case: { $eq: [{ $arrayElemAt: ['$teachingSubjectsInfo.name', 0] }, "SINH HỌC"] }, then: "SINH" },
                { case: { $eq: [{ $arrayElemAt: ['$teachingSubjectsInfo.name', 0] }, "TIẾNG ANH"] }, then: "ANH" },
                { case: { $eq: [{ $arrayElemAt: ['$teachingSubjectsInfo.name', 0] }, "NGỮ VĂN"] }, then: "VĂN" },
                { case: { $eq: [{ $arrayElemAt: ['$teachingSubjectsInfo.name', 0] }, "LỊCH SỬ"] }, then: "XH-SỬ" },
                { case: { $eq: [{ $arrayElemAt: ['$teachingSubjectsInfo.name', 0] }, "ĐỊA LÍ"] }, then: "XH-ĐỊA" },
                { case: { $eq: [{ $arrayElemAt: ['$teachingSubjectsInfo.name', 0] }, "KTPL"] }, then: "XH-KTPL" }
              ],
              default: { $arrayElemAt: ['$teachingSubjectsInfo.name', 0] }
            }
          },
          nameParts: {
            $let: {
              vars: {
                nameParts: { $split: ['$name', ' '] }
              },
              in: {
                firstName: { $arrayElemAt: ['$$nameParts', 0] },
                lastName: { $arrayElemAt: ['$$nameParts', { $subtract: [{ $size: '$$nameParts' }, 1] }] },
                middleName: {
                  $cond: {
                    if: { $gt: [{ $size: '$$nameParts' }, 2] },
                    then: {
                      $reduce: {
                        input: { $slice: ['$$nameParts', 1, { $subtract: [{ $size: '$$nameParts' }, 2] }] },
                        initialValue: '',
                        in: {
                          $cond: {
                            if: { $eq: ['$$value', ''] },
                            then: '$$this',
                            else: { $concat: ['$$value', ' ', '$$this'] }
                          }
                        }
                      }
                    },
                    else: ''
                  }
                }
              }
            }
          },
          campusDetails: {
            $let: {
              vars: {
                isHomeroomQ5: {
                  $and: [
                    { $gt: [{ $size: '$homeroomDetails' }, 0] },
                    { $eq: [{ $arrayElemAt: ['$homeroomClass.campus', 0] }, 'Quận 5'] }
                  ]
                },
                isHomeroomTD: {
                  $and: [
                    { $gt: [{ $size: '$homeroomDetails' }, 0] },
                    { $eq: [{ $arrayElemAt: ['$homeroomClass.campus', 0] }, 'Thủ Đức'] }
                  ]
                }
              },
              in: {
                Q5S: {
                  $sum: {
                    $map: {
                      input: {
                        $filter: {
                          input: '$teachingDetails',
                          as: 'detail',
                          cond: {
                            $and: [
                              { $eq: ['$$detail.campus', 'Quận 5'] },
                              { $eq: ['$$detail.isSpecialized', true] }
                            ]
                          }
                        }
                      },
                      as: 'filtered',
                      in: '$$filtered.completedLessons'
                    }
                  }
                },
                Q5NS: {
                  $add: [
                    {
                      $sum: {
                        $map: {
                          input: {
                            $filter: {
                              input: '$teachingDetails',
                              as: 'detail',
                              cond: {
                                $and: [
                                  { $eq: ['$$detail.campus', 'Quận 5'] },
                                  { $eq: ['$$detail.isSpecialized', false] }
                                ]
                              }
                            }
                          },
                          as: 'filtered',
                          in: '$$filtered.completedLessons'
                        }
                      }
                    },
                    { $cond: ['$$isHomeroomQ5', 36, 0] }
                  ]
                },
                TDS: {
                  $sum: {
                    $map: {
                      input: {
                        $filter: {
                          input: '$teachingDetails',
                          as: 'detail',
                          cond: {
                            $and: [
                              { $eq: ['$$detail.campus', 'Thủ Đức'] },
                              { $eq: ['$$detail.isSpecialized', true] }
                            ]
                          }
                        }
                      },
                      as: 'filtered',
                      in: '$$filtered.completedLessons'
                    }
                  }
                },
                TDNS: {
                  $add: [
                    {
                      $sum: {
                        $map: {
                          input: {
                            $filter: {
                              input: '$teachingDetails',
                              as: 'detail',
                              cond: {
                                $and: [
                                  { $eq: ['$$detail.campus', 'Thủ Đức'] },
                                  { $eq: ['$$detail.isSpecialized', false] }
                                ]
                              }
                            }
                          },
                          as: 'filtered',
                          in: '$$filtered.completedLessons'
                        }
                      }
                    },
                    { $cond: ['$$isHomeroomTD', 36, 0] }
                  ]
                }
              }
            }
          },
          totalAssignment: {
            $add: [
              { $sum: '$teachingDetails.completedLessons' },
              { $cond: [{ $gt: [{ $size: '$homeroomDetails' }, 0] }, 36, 0] }
            ]
          },
          declaredTeachingLessons: {
            $add: [
              { $sum: '$teachingDetails.declaredLessons' },
              { $cond: [{ $gt: [{ $size: '$homeroomDetails' }, 0] }, 36, 0] }
            ]
          },
          totalReductions: {
            $add: [
              { $ifNull: ['$totalReducedLessons', 0] },
              { $ifNull: [{ $arrayElemAt: ['$homeroomDetails.totalReducedLessons', 0] }, 0] }
            ]
          }
        }
      },
      {
        $addFields: {
          finalBasicTeachingLessons: {
            $subtract: ['$basicTeachingLessons', '$totalReductions']
          },
          homeroomInfo: {
            $cond: [
              { $gt: [{ $size: '$homeroomDetails' }, 0] },
              {
                className: { $arrayElemAt: ['$homeroomClass.name', 0] },
                grade: { $arrayElemAt: ['$homeroomClass.grade', 0] },
                reducedLessonsPerWeek: { $arrayElemAt: ['$homeroomDetails.reducedLessonsPerWeek', 0] },
                reducedWeeks: { $arrayElemAt: ['$homeroomDetails.reducedWeeks', 0] },
                totalReducedLessons: { $arrayElemAt: ['$homeroomDetails.totalReducedLessons', 0] },
                reductionReason: 'GVCN'
              },
              null
            ]
          }
        }
      },
      {
        $sort: {
          'nameParts.lastName': 1,
          'nameParts.middleName': 1,
          'nameParts.firstName': 1
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,  // Added email field
          type: 1,
          basicTeachingLessons: 1,
          reductions: 1,
          totalReducedLessons: 1,
          totalAssignment: 1,
          departmentName: '$departmentInfo.name',
          teachingSubjects: 1,
          homeroomInfo: 1,
          declaredTeachingLessons: 1,
          totalReductions: 1,
          finalBasicTeachingLessons: 1,
          totalLessonsQ5S: '$campusDetails.Q5S',
          totalLessonsQ5NS: '$campusDetails.Q5NS',
          totalLessonsTDS: '$campusDetails.TDS',
          totalLessonsTDNS: '$campusDetails.TDNS',
          teachingDetails: {
            $concatArrays: [
              '$teachingDetails',
              {
                $cond: [
                  { $gt: [{ $size: '$homeroomDetails' }, 0] },
                  [{
                    _id: 'homeroom',
                    className: { $arrayElemAt: ['$homeroomClass.name', 0] },
                    grade: { $arrayElemAt: ['$homeroomClass.grade', 0] },
                    subject: 'CCSHL',
                    completedLessons: 36,
                    lessonsPerWeek: 2,
                    numberOfWeeks: 18,
                    declaredLessons: 36
                  }],
                  []
                ]
              }
            ]
          }
        }
      }
    ]);

    // Sort using collator for proper Vietnamese string comparison
    const collator = new Intl.Collator('vi', {
      sensitivity: 'base',
      ignorePunctuation: true
    });

    teachers.sort((a, b) => {
      const [aLastName, ...aRestName] = a.name.trim().split(' ').reverse();
      const [bLastName, ...bRestName] = b.name.trim().split(' ').reverse();

      // Compare last names first
      const lastNameComparison = collator.compare(aLastName, bLastName);
      if (lastNameComparison !== 0) return lastNameComparison;

      // Compare rest of name
      const aRest = aRestName.reverse().join(' ');
      const bRest = bRestName.reverse().join(' ');
      return collator.compare(aRest, bRest);
    });

    res.status(200).json(teachers);
  } catch (error) {
    console.error('Error in getting all teachers:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Endpoint cho teachers above threshold
statisticsRouter.get('/teachers-above-threshold-count', isAuth, async (req, res) => {
  try {
    const { departmentId } = req.query;
    let matchStage = departmentId ? { department: new mongoose.Types.ObjectId(departmentId) } : {};
 
    // Thêm điều kiện type = "Cơ hữu" vào matchStage
    matchStage = {
      ...matchStage,
      type: "Cơ hữu"
    };

    
    
    const teachers = await Teacher.aggregate([
      ...commonPipeline(matchStage)
    ]);

    
 
    const teachersWithAssignments = await Promise.all(teachers.map(async (teacher) => {
      const assignments = await TeacherAssignment.find({ teacher: teacher._id })
        .populate({
          path: 'subject',
          select: 'isSpecialized'
        });
 
      const declaredTeachingLessons = assignments.reduce((sum, assignment) => 
        sum + (assignment.subject?.isSpecialized ? assignment.completedLessons * 3 : assignment.completedLessons), 
        0
      );
 
      return {
        ...teacher,
        declaredTeachingLessons
      };
    }));
 
    const count = teachersWithAssignments.filter(teacher => {
      const excessLessons = teacher.declaredTeachingLessons - teacher.finalBasicTeachingLessons;
      const thresholdLessons = teacher.finalBasicTeachingLessons * 0.25;
      return excessLessons > thresholdLessons;
    }).length;
 
    res.status(200).json({ count });
  } catch (error) {
    console.error('Error in getting teachers above threshold count:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
 });

// Endpoint cho teachers below basic
statisticsRouter.get('/teachers-below-basic-count', isAuth, async (req, res) => {
  try {
    const { departmentId } = req.query;
    let matchStage = departmentId ? { department: new mongoose.Types.ObjectId(departmentId) } : {};
    
    matchStage = {
      ...matchStage,
      type: "Cơ hữu" 
    };
 
    const teachers = await Teacher.aggregate([
      {
        $match: matchStage
      },
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
          totalReductions: {
            $add: [
              { $ifNull: ['$totalReducedLessons', 0] },
              { $ifNull: ['$homeroom.totalReducedLessons', 0] }
            ]
          },
          finalBasicTeachingLessons: {
            $max: [
              0,
              {
                $subtract: [
                  '$basicTeachingLessons',
                  {
                    $add: [
                      { $ifNull: ['$totalReducedLessons', 0] },
                      { $ifNull: ['$homeroom.totalReducedLessons', 0] }
                    ]
                  }
                ]
              }
            ]
          },
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
        $match: {
          $expr: { $lt: ['$declaredTeachingLessons', '$finalBasicTeachingLessons'] }
        }
      },
      {
        $sort: {
          'nameParts.lastName': 1,
          'nameParts.middleName': 1,
          'nameParts.firstName': 1
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
          teachingSubjects: 1,
          homeroomInfo: 1,
          declaredTeachingLessons: 1,
          reducedLessonsPerWeek: 1,
          reducedWeeks: 1,
          reductionReason: 1,
          totalReductions: 1,
          finalBasicTeachingLessons: 1
        }
      }
    ]);
 
    const teachersData = await Promise.all(teachers.map(async (teacher) => {
      const assignments = await TeacherAssignment.find({ teacher: teacher._id })
        .populate('class', 'name grade')
        .populate({
          path: 'subject',
          select: 'name isSpecialized'
        })
        .select('class subject completedLessons lessonsPerWeek numberOfWeeks');
 
      const teachingDetails = assignments.map(assignment => ({
        _id: assignment._id,
        className: assignment.class?.name,
        grade: assignment.class?.grade,
        subject: assignment.subject?.name,
        completedLessons: assignment.completedLessons,
        lessonsPerWeek: assignment.lessonsPerWeek,
        numberOfWeeks: assignment.numberOfWeeks,
        declaredLessons: assignment.subject?.isSpecialized ? 
          assignment.completedLessons * 3 : 
          assignment.completedLessons
      }));
 
      return {
        ...teacher,
        teachingDetails
      };
    }));
 
    const count = teachersData.length || 0;
    res.status(200).json({ count });
  } catch (error) {
    console.error('Error in getting teachers below basic lessons:', error);
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
    // Lấy danh sách GVCN
    const homeroomAssignments = await Homeroom.find()
      .select('teacher class')
      .populate('teacher', 'name')
      .populate('class', '_id')
      .lean();

    // Tạo map GVCN
    const homeroomTeacherMap = homeroomAssignments.reduce((acc, assignment) => {
      if (assignment.teacher?.name && assignment.class?._id) {
        acc[assignment.class._id.toString()] = assignment.teacher.name;
      }
      return acc;
    }, {});

    // Lấy tất cả assignments và tạo map
    const allAssignments = await TeacherAssignment.find()
      .populate('teacher', 'name')
      .lean();

    const assignmentsMap = allAssignments.reduce((acc, assignment) => {
      const key = `${assignment.class}-${assignment.subject}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push({
        teacherId: assignment.teacher._id,
        teacherName: assignment.teacher.name,
        completedLessons: assignment.completedLessons
      });
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

    const classesWithExtraInfo = classes.map(classItem => {
      const hasHomeroom = homeroomTeacherMap[classItem._id.toString()];
      
      // Xử lý môn học thông thường và thêm assignments
      const processedSubjects = (classItem.subjects || []).map(subject => ({
        ...subject,
        assignments: assignmentsMap[`${classItem._id}-${subject.subject._id}`] || []
      }));

      // Thêm môn CCSHL nếu lớp có GVCN
      if (hasHomeroom) {
        processedSubjects.push({
          subject: {
            name: "CCSHL"
          },
          lessonCount: 72,
          periodsPerWeek: 2,
          numberOfWeeks: 36,
          assignments: [{
            teacherName: homeroomTeacherMap[classItem._id.toString()],
            completedLessons: 72
          }]
        });
      }

      return {
        ...classItem,
        homeroomTeacher: homeroomTeacherMap[classItem._id.toString()] || null,
        subjects: processedSubjects
      };
    });

    // Sắp xếp theo tên lớp
    const sortedClasses = classesWithExtraInfo.sort((a, b) => 
      a.name.localeCompare(b.name, 'vi')
    );

    res.status(200).json(sortedClasses);
  } catch (error) {
    console.error('Error in GET /all-classes:', error);
    res.status(500).json({ 
      message: "Lỗi khi lấy danh sách lớp học", 
      error: error.message 
    });
  }
});

statisticsRouter.get('/department-classes', isAuth, async (req, res) => {
  try {
    // Lấy thông tin user từ token
    const user = await User.findById(req.user._id).populate('teacher');
    if (!user || user.role !== 0) {
      return res.status(403).json({ message: 'Chỉ tổ trưởng mới có quyền truy cập thông tin này' });
    }

    // Lấy thông tin teacher để xác định department
    const teacher = await Teacher.findOne({ email: user.email });
    if (!teacher) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin giáo viên' });
    }

    // Lấy danh sách môn học thuộc department
    const departmentSubjects = await Subject.find({ department: teacher.department })
      .select('_id')
      .lean();
    
    const subjectIds = departmentSubjects.map(subject => subject._id);

    // Lấy danh sách GVCN
    const homeroomAssignments = await Homeroom.find()
      .select('teacher class')
      .populate('teacher', 'name')
      .populate('class', '_id')
      .lean();

    // Tạo map GVCN
    const homeroomTeacherMap = homeroomAssignments.reduce((acc, assignment) => {
      if (assignment.teacher?.name && assignment.class?._id) {
        acc[assignment.class._id.toString()] = assignment.teacher.name;
      }
      return acc;
    }, {});

    // Lấy tất cả assignments và tạo map
    const allAssignments = await TeacherAssignment.find({
      subject: { $in: subjectIds }
    })
      .populate('teacher', 'name')
      .lean();

    const assignmentsMap = allAssignments.reduce((acc, assignment) => {
      const key = `${assignment.class}-${assignment.subject}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push({
        id: assignment._id,
        teacherId: assignment.teacher._id,
        teacherName: assignment.teacher.name,
        lessonsPerWeek: assignment.lessonsPerWeek,
        numberOfWeeks: assignment.numberOfWeeks,
        completedLessons: assignment.completedLessons
      });
      return acc;
    }, {});

    // Lấy các lớp có môn học thuộc department
    const classes = await Class.find({
      'subjects.subject': { $in: subjectIds }
    })
      .select('name grade subjects')
      .populate({
        path: 'subjects.subject',
        select: 'name',
      })
      .lean();

    const classesWithExtraInfo = classes.map(classItem => {
      // Lọc và chỉ giữ lại các môn thuộc department
      const filteredSubjects = classItem.subjects
        .filter(subject => subjectIds.some(id => id.equals(subject.subject._id)))
        .map(subject => ({
          ...subject,
          assignments: assignmentsMap[`${classItem._id}-${subject.subject._id}`] || []
        }));

      return {
        ...classItem,
        homeroomTeacher: classItem._id ? homeroomTeacherMap[classItem._id.toString()] || null : null,
        subjects: filteredSubjects
      };
    });

    // Sắp xếp theo tên lớp
    const sortedClasses = classesWithExtraInfo.sort((a, b) => 
      a.name.localeCompare(b.name, 'vi')
    );

    res.status(200).json(sortedClasses);
  } catch (error) {
    console.error('Error in GET /department-classes:', error);
    res.status(500).json({ 
      message: "Lỗi khi lấy danh sách lớp học của tổ bộ môn", 
      error: error.message 
    });
  }
});

statisticsRouter.get('/all-classes-subjects', isAuth, async (req, res) => {
  try {
    // Get all homeroom assignments
    const homeroomAssignments = await Homeroom.find()
      .select('teacher class')
      .populate('teacher', 'name')
      .populate('class', '_id')
      .lean();

    // Create homeroom teacher map
    const homeroomTeacherMap = homeroomAssignments.reduce((acc, assignment) => {
      if (assignment.teacher?.name && assignment.class?._id) {
        acc[assignment.class._id.toString()] = assignment.teacher.name;
      }
      return acc;
    }, {});

    // Get all assignments and create assignment map
    const allAssignments = await TeacherAssignment.find()
      .populate('teacher', 'name')
      .lean();

    const assignmentsMap = allAssignments.reduce((acc, assignment) => {
      const key = `${assignment.class}-${assignment.subject}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push({
        id: assignment._id,
        teacherId: assignment.teacher._id,
        teacherName: assignment.teacher.name,
        lessonsPerWeek: assignment.lessonsPerWeek,
        numberOfWeeks: assignment.numberOfWeeks,
        completedLessons: assignment.completedLessons
      });
      return acc;
    }, {});

    // Get all classes with their subjects
    const classes = await Class.find()
      .select('name grade subjects')
      .populate({
        path: 'subjects.subject',
        select: 'name',
      })
      .lean();

    const classesWithExtraInfo = classes.map(classItem => {
      // Process all subjects and add their assignments
      const processedSubjects = classItem.subjects.map(subject => ({
        ...subject,
        assignments: assignmentsMap[`${classItem._id}-${subject.subject._id}`] || []
      }));

      // Add CCSHL subject if class has a homeroom teacher
      const homeroomTeacher = classItem._id ? homeroomTeacherMap[classItem._id.toString()] : null;
      if (homeroomTeacher) {
        processedSubjects.push({
          subject: {
            name: "CCSHL"
          },
          lessonCount: 72,
          periodsPerWeek: 2,
          numberOfWeeks: 36,
          assignments: [{
            teacherName: homeroomTeacher,
            completedLessons: 72,
            lessonsPerWeek: 2,
            numberOfWeeks: 36
          }]
        });
      }

      return {
        ...classItem,
        homeroomTeacher,
        subjects: processedSubjects
      };
    });

    // Sort classes by name using Vietnamese locale
    const sortedClasses = classesWithExtraInfo.sort((a, b) => 
      a.name.localeCompare(b.name, 'vi')
    );

    res.status(200).json(sortedClasses);
  } catch (error) {
    console.error('Error in GET /all-classes-subjects:', error);
    res.status(500).json({ 
      message: "Lỗi khi lấy danh sách lớp học và môn học", 
      error: error.message 
    });
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