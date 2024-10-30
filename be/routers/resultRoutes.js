import express from 'express';
import Result from '../models/resultModel.js';
import Teacher from '../models/teacherModel.js';
import User from '../models/userModel.js';
import Class from '../models/classModels.js';
import Subject from '../models/subjectModels.js';
import { isAuth, isAdmin } from '../utils.js';

const resultRoutes = express.Router();

resultRoutes.get('/all', isAuth, isAdmin, async (req, res) => {
  try {
    const existingResult = await Result.find({})
      .sort({ timestamp: -1 })
      .populate('user', 'name email role')
      .lean();

    const transformedResults = await Promise.all(existingResult.map(async (result) => {
      // Check if user is ministry (role = 1)
      if (result.user.role === 1) {
        return {
          ...result,
          user: {
            ...result.user,
            teacher: {
              position: "Giáo vụ",
              department: {
                name: "Tổ Giáo vụ Đào tạo"
              },
              type: "Cơ hữu"
            }
          }
        };
      }

      // For other users, find teacher by email
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
      existingResult: transformedResults
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

    let transformedResult = result;

    // Populate teacher info for user
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

    // Populate details for TeacherAssignment CREATE action
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