import express from 'express';
import mongoose from 'mongoose';
import Class from '../models/classModels.js';
import Subject from '../models/subjectModels.js';
import Department from '../models/departmentModel.js';
import TeacherAssignment from '../models/teacherAssignmentModels.js';
import Result from '../models/resultModel.js';
import { isAuth } from '../utils.js';

const classRouter = express.Router();

classRouter.get('/classes', async (req, res) => {
  try {
    const classes = await Class.find()
      .populate({
        path: 'subjects.subject',
        select: 'name',
        populate: {
          path: 'department',
          select: 'name'
        }
      })
      .sort({ createdAt: -1 });

    res.status(200).json(classes);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách lớp học", error: error.message });
  }
});

classRouter.get('/:id', async (req, res) => {
  try {
    const classId = req.params.id;
    const classData = await Class.findById(classId)
      .populate({
        path: 'subjects.subject',
        select: 'name',
      });

    if (!classData) {
      return res.status(404).json({ message: "Không tìm thấy lớp học với ID đã cung cấp" });
    }

    res.status(200).json(classData);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy thông tin lớp học", error: error.message });
  }
});

classRouter.post('/create-class', isAuth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name, grade, campus, subjects } = req.body;

    const existingClass = await Class.findOne({ name });
    if (existingClass) {
      throw new Error('Tên lớp đã tồn tại');
    }

    const subjectIds = subjects.map(s => s.subjectId);
    const uniqueSubjectIds = new Set(subjectIds);
    if (subjectIds.length !== uniqueSubjectIds.size) {
      throw new Error('Môn học được khai báo trùng lặp');
    }

    const newClass = new Class({
      name,
      grade,
      campus,
      subjects: []
    });

    for (const subjectData of subjects) {
      const { subjectId, lessonCount } = subjectData;
      const subject = await Subject.findById(subjectId).populate('department');
      if (!subject) {
        throw new Error(`Không tìm thấy môn học với ID: ${subjectId}`);
      }
      newClass.subjects.push({
        subject: subject._id,
        lessonCount
      });
      await Department.findByIdAndUpdate(
        subject.department._id,
        { $inc: { totalAssignmentTime: lessonCount } },
        { session }
      );
    }

    await newClass.save({ session });

    // Create result
    await Result.create({
      action: 'CREATE',
      user: req.user._id,
      entityType: 'Class',
      entityId: newClass._id,
      dataAfter: newClass.toObject()
    });

    await session.commitTransaction();
    res.status(201).json({ message: "Lớp đã được tạo thành công", class: newClass });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

classRouter.post('/create-classes', isAuth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const classesData = req.body.classes;
    console.log(classesData);
    if (!Array.isArray(classesData) || classesData.length === 0) {
      throw new Error('Dữ liệu lớp học không hợp lệ');
    }

    const subjectOrder = [
      'Toán', 'Tin học', 'Vật lý', 'Hóa học', 'Sinh học', 'Công nghệ', 'Tiếng Anh',
      'Ngữ văn', 'Lịch sử', 'Địa lý', 'Giáo dục kinh tế - Pháp luật', 'Giáo dục Quốc phòng', 'Thể dục'
    ];

    const processedClasses = await Promise.all(classesData.map(async (classData) => {
      const { name, grade, campus, ...subjectData } = classData;
      
      if (!name || !grade || !campus) {
        throw new Error(`Thiếu thông tin cơ bản cho lớp: ${name || 'Unknown'}`);
      }

      const subjects = [];
      for (const subjectName of subjectOrder) {
        const lessonCount = parseInt(subjectData[subjectName], 10);
        
        if (!isNaN(lessonCount) && lessonCount > 0) {
          const subject = await Subject.findOne({ name: subjectName });
          if (!subject) {
            throw new Error(`Không tìm thấy môn học: ${subjectName}`);
          }
          subjects.push({ subject: subject._id, lessonCount });
        }
      }

      if (subjects.length === 0) {
        throw new Error(`Không có môn học hợp lệ cho lớp: ${name}`);
      }

      return { 
        name, 
        grade: parseInt(grade, 10), 
        campus, 
        subjects 
      };
    }));

    const classNames = processedClasses.map(c => c.name);
    const existingClasses = await Class.find({ name: { $in: classNames } });
    if (existingClasses.length > 0) {
      throw new Error(`Tên lớp đã tồn tại: ${existingClasses.map(c => c.name).join(', ')}`);
    }

    for (const classData of processedClasses) {
      const newClass = new Class(classData);
      await newClass.save({ session });

      for (const subjectData of classData.subjects) {
        const subject = await Subject.findById(subjectData.subject).populate('department');
        if (subject && subject.department) {
          await Department.findByIdAndUpdate(
            subject.department._id,
            { $inc: { totalAssignmentTime: subjectData.lessonCount } },
            { session }
          );
        }
      }

      // Create result for each class
      await Result.create({
        action: 'CREATE',
        user: req.user._id,
        entityType: 'Class',
        entityId: newClass._id,
        dataAfter: newClass.toObject()
      });
    }

    await session.commitTransaction();
    res.status(201).json({ message: "Các lớp đã được tạo thành công", classesCreated: processedClasses.length });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

classRouter.get('/department-classes/:departmentId', isAuth, async (req, res) => {
  try {
    const { departmentId } = req.params;
    
    const departmentSubjects = await Subject.find({ department: departmentId }).select('_id');
    const departmentSubjectIds = departmentSubjects.map(subject => subject._id);

    const classes = await Class.aggregate([
      {
        $match: {
          'subjects.subject': { $in: departmentSubjectIds }
        }
      },
      {
        $addFields: {
          subjects: {
            $filter: {
              input: '$subjects',
              as: 'subject',
              cond: { $in: ['$$subject.subject', departmentSubjectIds] }
            }
          }
        }
      },
      {
        $lookup: {
          from: 'subjects',
          localField: 'subjects.subject',
          foreignField: '_id',
          as: 'subjectDetails'
        }
      },
      {
        $addFields: {
          subjects: {
            $map: {
              input: '$subjects',
              as: 'subject',
              in: {
                $mergeObjects: [
                  '$$subject',
                  {
                    subject: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$subjectDetails',
                            as: 'detail',
                            cond: { $eq: ['$$detail._id', '$$subject.subject'] }
                          }
                        },
                        0
                      ]
                    }
                  }
                ]
              }
            }
          }
        }
      },
      {
        $project: {
          subjectDetails: 0
        }
      }
    ]);

    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: "Error fetching department classes", error: error.message });
  }
});

classRouter.delete('/:id/remove-subject/:subjectId', isAuth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id, subjectId } = req.params;

    const classToUpdate = await Class.findById(id).session(session);
    if (!classToUpdate) {
      throw new Error('Không tìm thấy lớp học với ID đã cung cấp');
    }

    const subjectIndex = classToUpdate.subjects.findIndex(s => s.subject.toString() === subjectId);
    if (subjectIndex === -1) {
      throw new Error('Không tìm thấy môn học trong lớp này');
    }

    const existingAssignment = await TeacherAssignment.findOne({
      class: id,
      subject: subjectId
    }).session(session);

    if (existingAssignment) {
      throw new Error('Không thể xóa môn học đã được phân công giảng dạy');
    }

    const classBefore = classToUpdate.toObject();

    const removedSubject = classToUpdate.subjects[subjectIndex];
    classToUpdate.subjects.splice(subjectIndex, 1);

    const subject = await Subject.findById(subjectId).populate('department').session(session);
    if (subject && subject.department) {
      await Department.findByIdAndUpdate(
        subject.department._id,
        { $inc: { totalAssignmentTime: -removedSubject.lessonCount } },
        { session }
      );
    }

    await classToUpdate.save({ session });

    // Create result
    await Result.create({
      action: 'UPDATE',
      user: req.user._id,
      entityType: 'Class',
      entityId: id,
      dataBefore: classBefore,
      dataAfter: classToUpdate.toObject()
    });

    await session.commitTransaction();
    res.status(200).json({ message: "Xóa môn học khỏi lớp thành công", class: classToUpdate });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

classRouter.post('/:id/add-subject', isAuth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { subjectId, lessonCount } = req.body;

    const classToUpdate = await Class.findById(id).session(session);
    if (!classToUpdate) {
      throw new Error('Không tìm thấy lớp học với ID đã cung cấp');
    }

    const subject = await Subject.findById(subjectId).populate('department').session(session);
    if (!subject) {
      throw new Error('Không tìm thấy môn học với ID đã cung cấp');
    }

    if (classToUpdate.subjects.some(s => s.subject.toString() === subjectId)) {
      throw new Error('Môn học đã tồn tại trong lớp này');
    }

    const classBefore = classToUpdate.toObject();

    classToUpdate.subjects.push({
      subject: subject._id,
      lessonCount
    });

    if (subject.department) {
      await Department.findByIdAndUpdate(
        subject.department._id,
        { $inc: { totalAssignmentTime: lessonCount } },
        { session }
      );
    }

    await classToUpdate.save({ session });

    // Create result
    await Result.create({
      action: 'UPDATE',
      user: req.user._id,
      entityType: 'Class',
      entityId: id,
      dataBefore: classBefore,
      dataAfter: classToUpdate.toObject()
    });

    await session.commitTransaction();

    res.status(200).json({ message: "Thêm môn học vào lớp thành công", class: classToUpdate });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

classRouter.delete('/:id', isAuth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    const classToDelete = await Class.findById(id).session(session);
    if (!classToDelete) {
      throw new Error('Không tìm thấy lớp học với ID đã cung cấp');
    }

    const existingAssignments = await TeacherAssignment.findOne({ class: id }).session(session);
    if (existingAssignments) {
      throw new Error('Không thể xóa lớp học đã có môn được phân công giảng dạy');
    }

    for (const subjectData of classToDelete.subjects) {
      const subject = await Subject.findById(subjectData.subject).populate('department').session(session);
      if (subject && subject.department) {
        await Department.findByIdAndUpdate(
          subject.department._id,
          { $inc: { totalAssignmentTime: -subjectData.lessonCount } },
          { session }
        );
      }
    }

    // Create result before deleting
    await Result.create({
      action: 'DELETE',
      user: req.user._id,
      entityType: 'Class',
      entityId: id,
      dataBefore: classToDelete.toObject()
    });

    await Class.findByIdAndDelete(id).session(session);

    await session.commitTransaction();
    res.status(200).json({ message: "Xóa lớp học thành công" });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

export default classRouter;