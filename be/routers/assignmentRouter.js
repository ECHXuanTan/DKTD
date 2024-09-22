import express from 'express';
import mongoose from 'mongoose';
import { isAuth } from '../utils.js';
import TeacherAssignment from '../models/teacherAssignmentModels.js';
import Class from '../models/classModels.js';
import Teacher from '../models/teacherModel.js';
import Department from '../models/departmentModel.js';
import Subject from '../models/subjectModels.js';
import Result from '../models/resultModel.js'; // Import the Result model

const assignmentRouter = express.Router();

assignmentRouter.post('/assign', isAuth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { classId, subjectId, assignments } = req.body;

    const classData = await Class.findById(classId).session(session);
    if (!classData) {
      throw new Error('Không tìm thấy lớp học');
    }

    const subjectData = classData.subjects.find(s => s.subject.toString() === subjectId);
    if (!subjectData) {
      throw new Error('Không tìm thấy môn học trong lớp này');
    }

    const existingAssignments = await TeacherAssignment.find({
      class: classId,
      subject: subjectId
    }).session(session);

    let totalExistingLessons = existingAssignments.reduce((sum, assignment) => sum + assignment.completedLessons, 0);

    let totalNewLessons = 0;
    for (const assignment of assignments) {
      totalNewLessons += assignment.lessons;
      
      const updatedAssignment = await TeacherAssignment.findOneAndUpdate(
        { teacher: assignment.teacherId, class: classId, subject: subjectId },
        { $set: { completedLessons: assignment.lessons } },
        { upsert: true, new: true, session }
      );

      await Teacher.findByIdAndUpdate(
        assignment.teacherId,
        { $inc: { totalAssignment: assignment.lessons } },
        { session }
      );

      // Create result record for each new assignment
      await Result.create({
        action: 'CREATE',
        user: req.user._id,
        entityType: 'TeacherAssignment',
        entityId: updatedAssignment._id,
        dataAfter: updatedAssignment.toObject()
      });
    }

    const totalAssignedLessons = totalExistingLessons + totalNewLessons;

    if (totalAssignedLessons > subjectData.lessonCount) {
      throw new Error('Tổng số tiết phân công vượt quá số tiết được khai báo cho môn học');
    }

    const subject = await Subject.findById(subjectId).session(session);
    if (!subject) {
      throw new Error('Không tìm thấy môn học');
    }

    await Department.findByIdAndUpdate(
      subject.department,
      { $inc: { declaredTeachingLessons: totalNewLessons } },
      { session }
    );

    await session.commitTransaction();

    res.status(200).json({ 
      message: "Phân công giảng dạy thành công",
      totalLessons: subjectData.lessonCount,
      assignedLessons: totalAssignedLessons,
      remainingLessons: subjectData.lessonCount - totalAssignedLessons
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

assignmentRouter.put('/edit', isAuth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { assignmentId, newLessons } = req.body;

    const assignment = await TeacherAssignment.findById(assignmentId).session(session);

    if (!assignment) {
      throw new Error('Không tìm thấy khai báo giảng dạy');
    }

    const oldAssignment = assignment.toObject();
    const oldLessons = assignment.completedLessons;
    const lessonDifference = newLessons - oldLessons;

    assignment.completedLessons = newLessons;
    await assignment.save({ session });

    const updatedTeacher = await Teacher.findByIdAndUpdate(
      assignment.teacher,
      { $inc: { totalAssignment: lessonDifference } },
      { new: true, session }
    );
    
    console.log('Updated teacher:', updatedTeacher);

    const subject = await Subject.findById(assignment.subject).session(session);
    await Department.findByIdAndUpdate(
      subject.department,
      { $inc: { declaredTeachingLessons: lessonDifference } },
      { session }
    );

    // Create result record for the update
    await Result.create({
      action: 'UPDATE',
      user: req.user._id,
      entityType: 'TeacherAssignment',
      entityId: assignmentId,
      dataBefore: oldAssignment,
      dataAfter: assignment.toObject()
    });

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

assignmentRouter.delete('/delete', isAuth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { assignmentId } = req.body;

    const assignment = await TeacherAssignment.findById(assignmentId).session(session);

    if (!assignment) {
      throw new Error('Không tìm thấy khai báo giảng dạy');
    }

    const deletedAssignment = assignment.toObject();

    await TeacherAssignment.findByIdAndDelete(assignmentId).session(session);

    await Teacher.findByIdAndUpdate(
      assignment.teacher,
      { $inc: { totalAssignment: -assignment.completedLessons } },
      { session }
    );

    const subject = await Subject.findById(assignment.subject).session(session);
    await Department.findByIdAndUpdate(
      subject.department,
      { $inc: { declaredTeachingLessons: -assignment.completedLessons } },
      { session }
    );

    // Create result record for the delete operation
    await Result.create({
      action: 'DELETE',
      user: req.user._id,
      entityType: 'TeacherAssignment',
      entityId: assignmentId,
      dataBefore: deletedAssignment
    });

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

assignmentRouter.get('/class-subject-info/:classId/:subjectId', isAuth, async (req, res) => {
  try {
    const { classId, subjectId } = req.params;

    const classInfo = await Class.findById(classId);
    const subjectInfo = classInfo.subjects.find(s => s.subject.toString() === subjectId);

    if (!subjectInfo) {
      return res.status(404).json({ message: 'Không tìm thấy môn học trong lớp này' });
    }

    const assignedLessons = await TeacherAssignment.aggregate([
      {
        $match: {
          class: new mongoose.Types.ObjectId(classId),
          subject: new mongoose.Types.ObjectId(subjectId)
        }
      },
      {
        $group: {
          _id: null,
          totalAssigned: { $sum: '$completedLessons' }
        }
      }
    ]);

    const totalAssigned = assignedLessons[0]?.totalAssigned || 0;
    const remainingLessons = subjectInfo.lessonCount - totalAssigned;

    res.json({
      totalLessons: subjectInfo.lessonCount,
      assignedLessons: totalAssigned,
      remainingLessons: remainingLessons
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

assignmentRouter.get('/by-subject/:subjectId', isAuth, async (req, res) => {
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