import express from 'express';
import mongoose from 'mongoose';
import { isAuth, isToTruong } from '../utils.js';
import TeacherAssignment from '../models/teacherAssignmentModels.js';
import Class from '../models/classModels.js';
import Teacher from '../models/teacherModel.js';
import Department from '../models/departmentModel.js';
import Subject from '../models/subjectModels.js';
import Result from '../models/resultModel.js'; // Import the Result model

const assignmentRouter = express.Router();

// Endpoint tạo assignment
assignmentRouter.post('/assign', isAuth, isToTruong, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { classId, subjectId, assignments } = req.body;

    const classData = await Class.findById(classId).session(session);
    if (!classData) {
      throw new Error('Không tìm thấy lớp học');
    }

    const subject = await Subject.findById(subjectId).populate('department').session(session);
    if (!subject) {
      throw new Error('Không tìm thấy môn học');
    }

    const subjectData = classData.subjects.find(s => s.subject.toString() === subjectId);
    if (!subjectData) {
      throw new Error('Không tìm thấy môn học trong lớp này');
    }

    const existingAssignments = await TeacherAssignment.find({
      class: classId,
      subject: subjectId
    }).session(session);

    if (classData.isSpecial) {
      if (existingAssignments.length + assignments.length > subjectData.maxTeachers) {
        throw new Error(`Vượt quá số lượng giáo viên tối đa (${subjectData.maxTeachers}) cho môn học này trong lớp đặc biệt`);
      }
    } else {
      let totalExistingLessons = existingAssignments.reduce((sum, assignment) => sum + assignment.completedLessons, 0);
      let totalNewLessons = assignments.reduce((sum, assignment) => sum + Math.max(0, assignment.lessons || 0), 0);
      if (totalExistingLessons + totalNewLessons > subjectData.lessonCount) {
        throw new Error('Tổng số tiết vượt quá số tiết cho phép của môn học');
      }
    }

    for (const assignment of assignments) {
      if (assignment.lessons < 0) {
        throw new Error('Số tiết không thể là số âm');
      }

      const teacher = await Teacher.findById(assignment.teacherId).populate('department').session(session);
      if (!teacher) {
        throw new Error('Không tìm thấy giáo viên');
      }

      const maxLessons = subjectData.lessonCount;
      const assignedLessons = classData.isSpecial ? 
        Math.min(Math.max(0, assignment.lessons), maxLessons) : 
        Math.min(Math.max(0, assignment.lessons), maxLessons - existingAssignments.reduce((sum, a) => sum + a.completedLessons, 0));

      if (assignedLessons === 0) {
        continue; // Skip this assignment if no lessons are assigned
      }

      const updatedAssignment = await TeacherAssignment.findOneAndUpdate(
        { teacher: assignment.teacherId, class: classId, subject: subjectId },
        { 
          $set: { 
            completedLessons: assignedLessons,
            maxLessons: maxLessons
          } 
        },
        { upsert: true, new: true, session }
      );

      await Teacher.findByIdAndUpdate(
        assignment.teacherId,
        { $inc: { totalAssignment: assignedLessons } },
        { session }
      );

      await Department.findByIdAndUpdate(
        subject.department._id,
        { $inc: { declaredTeachingLessons: assignedLessons } },
        { session }
      );

      const result = new Result({
        action: 'CREATE',
        user: req.user._id,
        entityType: 'TeacherAssignment',
        entityId: updatedAssignment._id,
        dataAfter: updatedAssignment
      });
      await result.save({ session });
    }

    await session.commitTransaction();
    res.status(200).json({ message: "Phân công giảng dạy thành công" });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

// Endpoint sửa assignment
assignmentRouter.put('/edit', isAuth, isToTruong, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { assignmentId, newLessons } = req.body;

    const assignment = await TeacherAssignment.findById(assignmentId)
      .populate('class')
      .populate({
        path: 'subject',
        populate: { path: 'department' }
      })
      .populate({
        path: 'teacher',
        populate: { path: 'department' }
      })
      .session(session);

    if (!assignment) {
      throw new Error('Không tìm thấy khai báo giảng dạy');
    }

    const oldAssignment = assignment.toObject();
    const oldLessons = assignment.completedLessons;
    const lessonDifference = newLessons - oldLessons;

    assignment.completedLessons = newLessons;
    await assignment.save({ session });

    await Teacher.findByIdAndUpdate(
      assignment.teacher._id,
      { $inc: { totalAssignment: lessonDifference } },
      { session }
    );

    // Update department's declaredTeachingLessons
    await Department.findByIdAndUpdate(
      assignment.subject.department._id,
      { $inc: { declaredTeachingLessons: lessonDifference } },
      { session }
    );

    // Create detailed result record for the update
    const result = new Result({
      action: 'UPDATE',
      user: req.user._id,
      entityType: 'TeacherAssignment',
      entityId: assignmentId,
      dataBefore: {
        _id: oldAssignment._id,
        class: {
          _id: oldAssignment.class._id,
          name: oldAssignment.class.name,
          grade: oldAssignment.class.grade
        },
        subject: {
          _id: oldAssignment.subject._id,
          name: oldAssignment.subject.name,
          department: {
            _id: oldAssignment.subject.department._id,
            name: oldAssignment.subject.department.name
          }
        },
        teacher: {
          _id: oldAssignment.teacher._id,
          name: oldAssignment.teacher.name,
          position: oldAssignment.teacher.position,
          department: {
            _id: oldAssignment.teacher.department._id,
            name: oldAssignment.teacher.department.name
          }
        },
        completedLessons: oldAssignment.completedLessons,
        createdAt: oldAssignment.createdAt,
        updatedAt: oldAssignment.updatedAt
      },
      dataAfter: {
        _id: assignment._id,
        class: {
          _id: assignment.class._id,
          name: assignment.class.name,
          grade: assignment.class.grade
        },
        subject: {
          _id: assignment.subject._id,
          name: assignment.subject.name,
          department: {
            _id: assignment.subject.department._id,
            name: assignment.subject.department.name
          }
        },
        teacher: {
          _id: assignment.teacher._id,
          name: assignment.teacher.name,
          position: assignment.teacher.position,
          department: {
            _id: assignment.teacher.department._id,
            name: assignment.teacher.department.name
          }
        },
        completedLessons: assignment.completedLessons,
        createdAt: assignment.createdAt,
        updatedAt: assignment.updatedAt
      }
    });
    await result.save({ session });

    await session.commitTransaction();

    res.status(200).json({ message: "Cập nhật khai báo giảng dạy thành công" });
  } catch (error) {
    console.error('Error in edit assignment:', error);
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

// Endpoint xóa assignment
assignmentRouter.delete('/delete', isAuth, isToTruong, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { assignmentId } = req.body;

    const assignment = await TeacherAssignment.findById(assignmentId)
      .populate('class')
      .populate({
        path: 'subject',
        populate: { path: 'department' }
      })
      .populate({
        path: 'teacher',
        populate: { path: 'department' }
      })
      .session(session);

    if (!assignment) {
      throw new Error('Không tìm thấy khai báo giảng dạy');
    }

    const deletedAssignment = assignment.toObject();

    await TeacherAssignment.findByIdAndDelete(assignmentId).session(session);

    await Teacher.findByIdAndUpdate(
      assignment.teacher._id,
      { $inc: { totalAssignment: -assignment.completedLessons } },
      { session }
    );

    // Update department's declaredTeachingLessons
    await Department.findByIdAndUpdate(
      assignment.subject.department._id,
      { $inc: { declaredTeachingLessons: -assignment.completedLessons } },
      { session }
    );

    // Create detailed result record for the delete operation
    const result = new Result({
      action: 'DELETE',
      user: req.user._id,
      entityType: 'TeacherAssignment',
      entityId: assignmentId,
      dataBefore: {
        _id: deletedAssignment._id,
        class: {
          _id: deletedAssignment.class._id,
          name: deletedAssignment.class.name,
          grade: deletedAssignment.class.grade
        },
        subject: {
          _id: deletedAssignment.subject._id,
          name: deletedAssignment.subject.name,
          department: {
            _id: deletedAssignment.subject.department._id,
            name: deletedAssignment.subject.department.name
          }
        },
        teacher: {
          _id: deletedAssignment.teacher._id,
          name: deletedAssignment.teacher.name,
          position: deletedAssignment.teacher.position,
          department: {
            _id: deletedAssignment.teacher.department._id,
            name: deletedAssignment.teacher.department.name
          }
        },
        completedLessons: deletedAssignment.completedLessons,
        createdAt: deletedAssignment.createdAt,
        updatedAt: deletedAssignment.updatedAt
      }
    });
    await result.save({ session });

    await session.commitTransaction();

    res.status(200).json({ message: "Xóa khai báo giảng dạy thành công" });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

assignmentRouter.get('/teacher/:teacherId', isAuth, async (req, res) => {
  try {
    const { teacherId } = req.params;
    console.log(req.user);

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: 'Không tìm thấy giáo viên' });
    }

    const assignments = await TeacherAssignment.find({ teacher: teacherId })
      .populate('class', 'name _id')
      .populate('subject', 'name _id');

    if (assignments.length === 0) {
      return res.status(200).json([]);
    }

    const formattedAssignments = assignments.map(assignment => ({
      id: assignment._id,
      className: assignment.class.name,
      classId: assignment.class._id,
      subjectName: assignment.subject.name,
      subjectId: assignment.subject._id,
      completedLessons: assignment.completedLessons
    }));

    res.status(200).json(formattedAssignments);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

assignmentRouter.get('/class-subject-info/:classId/:subjectId/:teacherId?', isAuth, isToTruong, async (req, res) => {
  try {
    const { classId, subjectId, teacherId } = req.params;

    const classInfo = await Class.findById(classId);
    if (!classInfo) {
      return res.status(404).json({ message: 'Không tìm thấy lớp học' });
    }

    const subjectInfo = classInfo.subjects.find(s => s.subject.toString() === subjectId);
    if (!subjectInfo) {
      return res.status(404).json({ message: 'Không tìm thấy môn học trong lớp này' });
    }

    let assignedLessons = 0;
    let remainingLessons = subjectInfo.lessonCount;
    let teacherAssignment = null;

    if (classInfo.isSpecial) {
      // Special class
      if (teacherId) {
        teacherAssignment = await TeacherAssignment.findOne({
          class: classId,
          subject: subjectId,
          teacher: teacherId
        }).populate('teacher', 'name');

        if (teacherAssignment) {
          assignedLessons = teacherAssignment.completedLessons;
          remainingLessons = subjectInfo.lessonCount - assignedLessons;
        }
      }
    } else {
      // Normal class
      const assignedTeachers = await TeacherAssignment.find({
        class: classId,
        subject: subjectId
      }).populate('teacher', 'name');

      assignedLessons = assignedTeachers.reduce((sum, assignment) => sum + assignment.completedLessons, 0);
      remainingLessons = Math.max(0, subjectInfo.lessonCount - assignedLessons);

      if (teacherId) {
        teacherAssignment = assignedTeachers.find(a => a.teacher._id.toString() === teacherId);
      }
    }

    res.json({
      isSpecialClass: classInfo.isSpecial,
      totalLessons: subjectInfo.lessonCount,
      assignedLessons: assignedLessons,
      remainingLessons: remainingLessons,
      teacherAssignment: teacherAssignment ? {
        id: teacherAssignment.teacher._id,
        name: teacherAssignment.teacher.name,
        completedLessons: teacherAssignment.completedLessons
      } : null
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

assignmentRouter.get('/by-subject/:subjectId', isAuth, isToTruong, async (req, res) => {
  try {
    const { subjectId } = req.params;

    const assignments = await TeacherAssignment.aggregate([
      {
        $match: { subject: new mongoose.Types.ObjectId(subjectId) }
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
        $group: {
          _id: '$class',
          className: { $first: '$classInfo.name' },
          grade: { $first: '$classInfo.grade' },
          subjects: { $first: '$classInfo.subjects' },
          assignments: {
            $push: {
              _id: '$_id',
              teacherId: '$teacher',
              teacherName: '$teacherInfo.name',
              completedLessons: '$completedLessons'
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          classId: '$_id',
          className: 1,
          grade: 1,
          subjects: {
            $filter: {
              input: '$subjects',
              as: 'subject',
              cond: { $eq: ['$$subject.subject', new mongoose.Types.ObjectId(subjectId)] }
            }
          },
          assignments: 1
        }
      }
    ]);

    res.status(200).json(assignments);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

export default assignmentRouter;