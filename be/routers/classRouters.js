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

    // Chuẩn bị dữ liệu cho Result
    const resultData = {
      action: 'CREATE',
      user: req.user._id,
      entityType: 'Class',
      entityId: [newClass._id], // Đặt trong một mảng để phù hợp với cấu trúc của endpoint tạo nhiều lớp
      dataAfter: [{  // Đặt trong một mảng để phù hợp với cấu trúc của endpoint tạo nhiều lớp
        ...newClass.toObject(),
        subjects: newClass.subjects.map(s => ({
          subject: s.subject.toString(),
          lessonCount: s.lessonCount
        }))
      }]
    };

    // Tạo Result
    const result = new Result(resultData);
    await result.save({ session });

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
    if (!Array.isArray(classesData) || classesData.length === 0) {
      throw new Error('Dữ liệu lớp học không hợp lệ');
    }

    const processedClasses = await Promise.all(classesData.map(async (classData) => {
      const { name, grade, campus, subjects } = classData;
      
      if (!name || !grade || !campus) {
        throw new Error(`Thiếu thông tin cơ bản cho lớp: ${name || 'Unknown'}`);
      }

      const processedSubjects = await Promise.all(subjects.map(async (subjectData) => {
        const { name: subjectName, lessonCount } = subjectData;
        const subject = await Subject.findOne({ name: subjectName });
        if (!subject) {
          throw new Error(`Không tìm thấy môn học: ${subjectName}`);
        }
        return { 
          subject: subject._id,
          lessonCount: parseInt(lessonCount, 10)
        };
      }));

      return { 
        name, 
        grade: parseInt(grade, 10), 
        campus, 
        subjects: processedSubjects 
      };
    }));

    const classNames = processedClasses.map(c => c.name);
    const existingClasses = await Class.find({ name: { $in: classNames } });
    if (existingClasses.length > 0) {
      throw new Error(`Tên lớp đã tồn tại: ${existingClasses.map(c => c.name).join(', ')}`);
    }

    const createdClasses = [];
    for (const classData of processedClasses) {
      const newClass = new Class(classData);
      await newClass.save({ session });
      createdClasses.push(newClass);

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
    }

    // Tạo document Result
    const resultData = {
      action: 'CREATE',
      user: req.user._id,
      entityType: 'Class',
      entityId: createdClasses.map(c => c._id),
      dataAfter: createdClasses.map(c => ({
        ...c.toObject(),
        subjects: c.subjects.map(s => ({
          subject: s.subject.toString(),
          lessonCount: s.lessonCount
        }))
      }))
    };

    const result = new Result(resultData);
    await result.save({ session });

    await session.commitTransaction();
    res.status(201).json({ message: "Các lớp đã được tạo thành công", classesCreated: createdClasses.length });
  } catch (error) {
    await session.abortTransaction();
    console.error('Chi tiết lỗi:', error);
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

    const classToUpdate = await Class.findById(id).populate('subjects.subject').session(session);
    if (!classToUpdate) {
      throw new Error('Không tìm thấy lớp học với ID đã cung cấp');
    }

    const subjectIndex = classToUpdate.subjects.findIndex(s => s.subject._id.toString() === subjectId);
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

    // Prepare dataBefore with subject names
    const classBefore = {
      ...classToUpdate.toObject(),
      subjects: classToUpdate.subjects.map(s => ({
        subject: s.subject._id,
        subjectName: s.subject.name,
        lessonCount: s.lessonCount
      }))
    };

    const removedSubject = classToUpdate.subjects[subjectIndex];
    classToUpdate.subjects.splice(subjectIndex, 1);

    if (removedSubject.subject.department) {
      await Department.findByIdAndUpdate(
        removedSubject.subject.department,
        { $inc: { totalAssignmentTime: -removedSubject.lessonCount } },
        { session }
      );
    }

    await classToUpdate.save({ session });

    // Prepare dataAfter with subject names
    const dataAfter = {
      ...classToUpdate.toObject(),
      subjects: classToUpdate.subjects.map(s => ({
        subject: s.subject._id,
        subjectName: s.subject.name,
        lessonCount: s.lessonCount
      }))
    };

    // Create result with all required fields
    const result = new Result({
      action: 'UPDATE',
      user: req.user._id,
      entityType: 'Class',
      entityId: id,
      dataBefore: classBefore,
      dataAfter: dataAfter
    });

    await result.save({ session });

    await session.commitTransaction();
    res.status(200).json({ message: "Xóa môn học khỏi lớp thành công", class: dataAfter });
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

    const classToUpdate = await Class.findById(id).populate('subjects.subject').session(session);
    if (!classToUpdate) {
      throw new Error('Không tìm thấy lớp học với ID đã cung cấp');
    }

    const subject = await Subject.findById(subjectId).populate('department').session(session);
    if (!subject) {
      throw new Error('Không tìm thấy môn học với ID đã cung cấp');
    }

    if (classToUpdate.subjects.some(s => s.subject._id.toString() === subjectId)) {
      throw new Error('Môn học đã tồn tại trong lớp này');
    }

    // Prepare dataBefore with subject names
    const classBefore = {
      ...classToUpdate.toObject(),
      subjects: classToUpdate.subjects.map(s => ({
        subject: s.subject._id,
        subjectName: s.subject.name,
        lessonCount: s.lessonCount
      }))
    };

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

    // Prepare dataAfter with subject names, including the newly added subject
    const dataAfter = {
      ...classToUpdate.toObject(),
      subjects: [
        ...classBefore.subjects,
        {
          subject: subject._id,
          subjectName: subject.name,
          lessonCount
        }
      ]
    };

    // Create result
    const result = new Result({
      action: 'UPDATE',
      user: req.user._id,
      entityType: 'Class',
      entityId: id,
      dataBefore: classBefore,
      dataAfter: dataAfter
    });

    await result.save({ session });

    await session.commitTransaction();

    res.status(200).json({ message: "Thêm môn học vào lớp thành công", class: dataAfter });
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

    const classToDelete = await Class.findById(id).populate('subjects.subject').session(session);
    if (!classToDelete) {
      throw new Error('Không tìm thấy lớp học với ID đã cung cấp');
    }

    const existingAssignments = await TeacherAssignment.findOne({ class: id }).session(session);
    if (existingAssignments) {
      throw new Error('Không thể xóa lớp học đã có môn được phân công giảng dạy');
    }

    // Prepare detailed data for Result
    const detailedClassData = {
      ...classToDelete.toObject(),
      subjects: await Promise.all(classToDelete.subjects.map(async (subjectData) => {
        const subject = await Subject.findById(subjectData.subject._id).populate('department').session(session);
        return {
          subject: subjectData.subject._id,
          subjectName: subject.name,
          lessonCount: subjectData.lessonCount,
          departmentName: subject.department ? subject.department.name : null
        };
      }))
    };

    for (const subjectData of detailedClassData.subjects) {
      if (subjectData.departmentName) {
        await Department.findOneAndUpdate(
          { name: subjectData.departmentName },
          { $inc: { totalAssignmentTime: -subjectData.lessonCount } },
          { session }
        );
      }
    }

    // Create result before deleting
    const result = new Result({
      action: 'DELETE',
      user: req.user._id,
      entityType: 'Class',
      entityId: id,
      dataBefore: detailedClassData,
      dataAfter: null  // Since it's a deletion, dataAfter is null
    });

    await result.save({ session });

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

classRouter.put('/:id/update-subject/:subjectId', isAuth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id, subjectId } = req.params;
    const { lessonCount } = req.body;

    const classToUpdate = await Class.findById(id).populate('subjects.subject').session(session);
    if (!classToUpdate) {
      throw new Error('Không tìm thấy lớp học với ID đã cung cấp');
    }

    const subjectIndex = classToUpdate.subjects.findIndex(s => s.subject._id.toString() === subjectId);
    if (subjectIndex === -1) {
      throw new Error('Không tìm thấy môn học trong lớp này');
    }

    // Prepare dataBefore with subject names
    const classBefore = {
      ...classToUpdate.toObject(),
      subjects: classToUpdate.subjects.map(s => ({
        subject: s.subject._id,
        subjectName: s.subject.name,
        lessonCount: s.lessonCount
      }))
    };

    const oldLessonCount = classToUpdate.subjects[subjectIndex].lessonCount;
    const lessonCountDifference = lessonCount - oldLessonCount;

    classToUpdate.subjects[subjectIndex].lessonCount = lessonCount;

    if (classToUpdate.subjects[subjectIndex].subject.department) {
      await Department.findByIdAndUpdate(
        classToUpdate.subjects[subjectIndex].subject.department,
        { $inc: { totalAssignmentTime: lessonCountDifference } },
        { session }
      );
    }

    await classToUpdate.save({ session });

    // Prepare dataAfter with subject names
    const dataAfter = {
      ...classToUpdate.toObject(),
      subjects: classToUpdate.subjects.map(s => ({
        subject: s.subject._id,
        subjectName: s.subject.name,
        lessonCount: s.lessonCount
      }))
    };

    // Create result
    const result = new Result({
      action: 'UPDATE',
      user: req.user._id,
      entityType: 'Class',
      entityId: id,
      dataBefore: classBefore,
      dataAfter: dataAfter
    });

    await result.save({ session });

    await session.commitTransaction();
    res.status(200).json({ message: "Cập nhật số tiết môn học thành công", class: dataAfter });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

export default classRouter;