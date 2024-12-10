import express from 'express';
import Result from '../models/resultModel.js';
import Teacher from '../models/teacherModel.js';
import User from '../models/userModel.js';
import Class from '../models/classModels.js';
import Subject from '../models/subjectModels.js';
import Department from '../models/departmentModel.js';
import { isAuth, isAdmin } from '../utils.js';

const resultRoutes = express.Router();

resultRoutes.get('/all', isAuth, isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 100;
    const skip = (page - 1) * limit;

    const totalCount = await Result.countDocuments({});
    
    const existingResult = await Result.find({})
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email role')
      .lean();

    const transformedResults = await Promise.all(existingResult.map(async (result) => {
      if (result.user.role === 1) {
        return {
          ...result,
          user: {
            ...result.user,
            teacher: {
              position: "Giáo vụ",
              department: {
                name: "Tổ Giáo vụ - Đào tạo"
              },
              type: "Cơ hữu"
            }
          }
        };
      }

      const teacher = await Teacher.findOne({ email: result.user.email })
        .populate('department', 'name')
        .lean();

      return {
        ...result,
        user: {
          ...result.user,
          teacher: teacher ? {
            position: teacher.position,
            department: {
              name: teacher.department.name
            },
            type: teacher.type
          } : {
            position: 'N/A',
            department: {
              name: 'N/A'
            },
            type: 'N/A'
          }
        }
      };
    }));
    
    res.status(200).json({ 
      existingResult: transformedResults,
      pagination: {
        total: totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error in getting all results:', error);
    res.status(500).json({ 
      message: 'Đã xảy ra lỗi khi lấy kết quả.',
      error: error.message 
    });
  }
});

resultRoutes.get('/:id', isAuth, isAdmin, async (req, res) => {
  try {
    const resultId = req.params.id;
    const result = await Result.findById(resultId)
      .populate('user', 'name email role')
      .lean();

    if (!result) {
      return res.status(404).json({ message: 'Không tìm thấy kết quả với ID đã cho.' });
    }

    let transformedResult = { ...result };

    if (result.user.role === 1) {
      transformedResult.user.teacher = {
        position: "Giáo vụ",
        department: { name: "Tổ Giáo vụ Đào tạo" },
        type: "Cơ hữu"
      };
    } else {
      const teacher = await Teacher.findOne({ email: result.user.email })
        .populate('department', 'name')
        .lean();

      transformedResult.user.teacher = teacher ? {
        position: teacher.position,
        department: { name: teacher.department.name },
        type: teacher.type
      } : {
        position: 'N/A',
        department: { name: 'N/A' },
        type: 'N/A'
      };
    }

    if (result.entityType === 'Teacher') {
      if (result.dataBefore) {
        const [departmentBefore, subjectBefore] = await Promise.all([
          Department.findById(result.dataBefore.department).lean(),
          Subject.findById(result.dataBefore.teachingSubjects).lean()
        ]);

        transformedResult.dataBefore = {
          ...result.dataBefore,
          department: departmentBefore?.name || 'Unknown Department',
          teachingSubjects: subjectBefore?.name || 'Unknown Subject'
        };
      }

      if (result.dataAfter) {
        const [departmentAfter, subjectAfter] = await Promise.all([
          Department.findById(result.dataAfter.department).lean(),
          Subject.findById(result.dataAfter.teachingSubjects).lean()
        ]);

        transformedResult.dataAfter = {
          ...result.dataAfter,
          department: departmentAfter?.name || 'Unknown Department',
          teachingSubjects: subjectAfter?.name || 'Unknown Subject'
        };
      }
    }

    if (result.entityType === 'Class' && result.dataAfter) {
      if (Array.isArray(result.dataAfter)) {
        const classesWithSubjects = await Promise.all(result.dataAfter.map(async (classData) => {
          const subjectIds = classData.subjects.map(s => s.subject);
          const subjects = await Subject.find({ _id: { $in: subjectIds } }).lean();
          
          return {
            ...classData,
            subjects: classData.subjects.map(subject => ({
              ...subject,
              subjectName: subjects.find(s => s._id.toString() === subject.subject.toString())?.name || 'Unknown Subject'
            }))
          };
        }));
        transformedResult.dataAfter = classesWithSubjects;
      }
    }

    if (result.entityType === 'TeacherAssignment' && result.action === 'CREATE' && result.dataAfter) {
      const [classData, subjectData, teacherData] = await Promise.all([
        Class.findById(result.dataAfter.class).lean(),
        Subject.findById(result.dataAfter.subject).lean(),
        Teacher.findById(result.dataAfter.teacher).lean()
      ]);

      transformedResult.dataAfter = {
        ...result.dataAfter,
        class: classData ? {
          _id: classData._id,
          name: classData.name,
          grade: classData.grade,
          campus: classData.campus
        } : { name: 'Unknown Class' },
        subject: subjectData ? {
          _id: subjectData._id,
          name: subjectData.name
        } : { name: 'Unknown Subject' },
        teacher: teacherData ? {
          _id: teacherData._id,
          name: teacherData.name
        } : { name: 'Unknown Teacher' }
      };
    }

    res.status(200).json({ result: transformedResult });
  } catch (error) {
    console.error('Error in getting result by ID:', error);
    res.status(500).json({ 
      message: 'Đã xảy ra lỗi khi lấy kết quả.',
      error: error.message 
    });
  }
});

export default resultRoutes;