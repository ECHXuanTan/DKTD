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
// Helper function to sort classes
const sortClasses = (a, b) => {
  if (a.grade !== b.grade) {
    return a.grade - b.grade;
  }
  return a.className.localeCompare(b.className, 'vi', { sensitivity: 'base' });
};

// POST endpoint để tạo assignment
assignmentRouter.post('/assign', isAuth, isToTruong, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { assignments } = req.body;
    
    // Validate input
    if (!Array.isArray(assignments) || assignments.length === 0) {
      throw new Error('Dữ liệu không hợp lệ');
    }

    // Group assignments by class and subject
    const groupedAssignments = assignments.reduce((acc, curr) => {
      const key = `${curr.classId}-${curr.subjectId}`;
      if (!acc[key]) {
        acc[key] = {
          classId: curr.classId,
          subjectId: curr.subjectId,
          assignments: []
        };
      }
      acc[key].assignments.push({
        teacherId: curr.teacherId,
        lessonsPerWeek: curr.lessonsPerWeek,
        numberOfWeeks: curr.numberOfWeeks
      });
      return acc;
    }, {});

    // Process each group of assignments
    for (const group of Object.values(groupedAssignments)) {
      const { classId, subjectId, assignments: groupAssignments } = group;

      // Validate class and subject
      const classData = await Class.findById(classId).session(session);
      if (!classData) {
        throw new Error(`Không tìm thấy lớp học với ID ${classId}`);
      }

      const subject = await Subject.findById(subjectId)
        .populate('department')
        .session(session);
      if (!subject) {
        throw new Error(`Không tìm thấy môn học với ID ${subjectId}`);
      }

      const subjectData = classData.subjects.find(
        s => s.subject.toString() === subjectId
      );
      if (!subjectData) {
        throw new Error(`Không tìm thấy môn học ${subject.name} trong lớp ${classData.name}`);
      }

      // Get existing assignments
      const existingAssignments = await TeacherAssignment.find({
        class: classId,
        subject: subjectId
      }).session(session);

      // Validate assignments based on class type
      if (classData.isSpecial) {
        if (existingAssignments.length + groupAssignments.length > subjectData.maxTeachers) {
          throw new Error(
            `Vượt quá số lượng giáo viên tối đa (${subjectData.maxTeachers}) cho môn ${subject.name} trong lớp ${classData.name}`
          );
        }
      } else {
        const totalExistingLessons = existingAssignments.reduce(
          (sum, assignment) => sum + assignment.completedLessons,
          0
        );
        // Tính tổng số tiết mới dựa trên số tiết/tuần và số tuần
        const totalNewLessons = groupAssignments.reduce(
          (sum, assignment) => {
            if (assignment.lessonsPerWeek < 0 || assignment.numberOfWeeks < 0) {
              throw new Error('Số tiết một tuần và số tuần không thể là số âm');
            }
            return sum + (assignment.lessonsPerWeek * assignment.numberOfWeeks);
          },
          0
        );
        
        if (totalExistingLessons + totalNewLessons > subjectData.lessonCount) {
          throw new Error(
            `Tổng số tiết (${totalExistingLessons + totalNewLessons}) vượt quá số tiết cho phép (${subjectData.lessonCount}) của môn ${subject.name} trong lớp ${classData.name}`
          );
        }
      }

      // Process individual assignments
      for (const assignment of groupAssignments) {
        const teacher = await Teacher.findById(assignment.teacherId)
          .populate('department')
          .session(session);
        if (!teacher) {
          throw new Error(`Không tìm thấy giáo viên với ID ${assignment.teacherId}`);
        }

        // Tính số tiết từ số tiết/tuần và số tuần
        const calculatedLessons = assignment.lessonsPerWeek * assignment.numberOfWeeks;
        const maxLessons = subjectData.lessonCount;
        
        const assignedLessons = classData.isSpecial
          ? Math.min(calculatedLessons, maxLessons)
          : Math.min(
              calculatedLessons,
              maxLessons - existingAssignments.reduce((sum, a) => sum + a.completedLessons, 0)
            );

        if (assignedLessons === 0) continue;

        // Create assignment
        const updatedAssignment = await TeacherAssignment.findOneAndUpdate(
          {
            teacher: assignment.teacherId,
            class: classId,
            subject: subjectId
          },
          {
            $set: {
              completedLessons: assignedLessons,
              lessonsPerWeek: assignment.lessonsPerWeek,
              numberOfWeeks: assignment.numberOfWeeks,
            }
          },
          { upsert: true, new: true, session }
        );

        // Update related collections
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

        // Create result record
        const result = new Result({
          action: 'CREATE',
          user: req.user._id,
          entityType: 'TeacherAssignment',
          entityId: updatedAssignment._id,
          dataAfter: updatedAssignment
        });
        await result.save({ session });
      }
    }

    await session.commitTransaction();
    res.status(200).json({ message: 'Phân công giảng dạy thành công' });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

// PUT endpoint để sửa assignment
assignmentRouter.put('/edit', isAuth, isToTruong, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { assignmentId, lessonsPerWeek, numberOfWeeks } = req.body;

    if (lessonsPerWeek < 0 || numberOfWeeks < 0) {
      throw new Error('Số tiết một tuần và số tuần không thể là số âm');
    }

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

    // Lưu trạng thái cũ trước khi cập nhật
    const oldAssignment = assignment.toObject();
    const oldLessons = assignment.completedLessons;
    
    // Tính số tiết mới từ số tiết/tuần và số tuần
    const newLessons = lessonsPerWeek * numberOfWeeks;
    const lessonDifference = newLessons - oldLessons;

    // Kiểm tra số tiết có vượt quá số tiết cho phép không
    const classSubject = assignment.class.subjects.find(
      s => s.subject.toString() === assignment.subject._id.toString()
    );
    if (!classSubject) {
      throw new Error('Không tìm thấy thông tin môn học trong lớp');
    }

    // Tính tổng số tiết đã phân công cho môn học trong lớp (trừ assignment hiện tại)
    const existingAssignments = await TeacherAssignment.find({
      class: assignment.class._id,
      subject: assignment.subject._id,
      _id: { $ne: assignmentId }
    }).session(session);

    const totalAssignedLessons = existingAssignments.reduce(
      (sum, a) => sum + a.completedLessons,
      0
    );

    // Kiểm tra tổng số tiết mới có vượt quá giới hạn không
    if (totalAssignedLessons + newLessons > classSubject.lessonCount) {
      throw new Error(
        `Tổng số tiết (${totalAssignedLessons + newLessons}) vượt quá số tiết cho phép (${classSubject.lessonCount})`
      );
    }

    // Cập nhật assignment với các giá trị mới
    assignment.lessonsPerWeek = lessonsPerWeek;
    assignment.numberOfWeeks = numberOfWeeks;
    assignment.completedLessons = newLessons;
    const updatedAssignment = await assignment.save({ session });

    // Cập nhật tổng số tiết của giáo viên
    await Teacher.findByIdAndUpdate(
      assignment.teacher._id,
      { $inc: { totalAssignment: lessonDifference } },
      { session }
    );

    // Cập nhật số tiết khai báo của tổ bộ môn
    await Department.findByIdAndUpdate(
      assignment.subject.department._id,
      { $inc: { declaredTeachingLessons: lessonDifference } },
      { session }
    );

    // Tạo bản ghi kết quả
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
        lessonsPerWeek: oldAssignment.lessonsPerWeek,
        numberOfWeeks: oldAssignment.numberOfWeeks,
        completedLessons: oldAssignment.completedLessons,
        createdAt: oldAssignment.createdAt,
        updatedAt: oldAssignment.updatedAt
      },
      dataAfter: {
        _id: updatedAssignment._id,
        class: {
          _id: updatedAssignment.class._id,
          name: updatedAssignment.class.name,
          grade: updatedAssignment.class.grade
        },
        subject: {
          _id: updatedAssignment.subject._id,
          name: updatedAssignment.subject.name,
          department: {
            _id: updatedAssignment.subject.department._id,
            name: updatedAssignment.subject.department.name
          }
        },
        teacher: {
          _id: updatedAssignment.teacher._id,
          name: updatedAssignment.teacher.name,
          position: updatedAssignment.teacher.position,
          department: {
            _id: updatedAssignment.teacher.department._id,
            name: updatedAssignment.teacher.department.name
          }
        },
        lessonsPerWeek: updatedAssignment.lessonsPerWeek,
        numberOfWeeks: updatedAssignment.numberOfWeeks,
        completedLessons: updatedAssignment.completedLessons,
        createdAt: updatedAssignment.createdAt,
        updatedAt: updatedAssignment.updatedAt
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

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: 'Không tìm thấy giáo viên' });
    }

    const assignments = await TeacherAssignment.find({ teacher: teacherId })
      .populate('class', 'name grade _id')
      .populate('subject', 'name _id');

    if (assignments.length === 0) {
      return res.status(200).json([]);
    }

    const formattedAssignments = assignments.map(assignment => ({
      id: assignment._id,
      className: assignment.class.name,
      classId: assignment.class._id,
      grade: assignment.class.grade,
      subjectName: assignment.subject.name,
      subjectId: assignment.subject._id,
      completedLessons: assignment.completedLessons,
      lessonsPerWeek: assignment.lessonsPerWeek || 0, // Thêm trường mới
      numberOfWeeks: assignment.numberOfWeeks || 0
    }));

    // Sort assignments by grade and class name
    const sortedAssignments = formattedAssignments.sort(sortClasses);

    res.status(200).json(sortedAssignments);
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

// Thêm endpoint chỉnh sửa nhiều assignments
assignmentRouter.put('/batch-edit', isAuth, isToTruong, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { assignments } = req.body; // array of {assignmentId, lessonsPerWeek, numberOfWeeks}
    
    if (!Array.isArray(assignments)) {
      throw new Error('Dữ liệu không hợp lệ');
    }

    for (const { assignmentId, lessonsPerWeek, numberOfWeeks } of assignments) {
      if (lessonsPerWeek < 0 || numberOfWeeks < 0) {
        throw new Error('Số tiết một tuần và số tuần không thể là số âm');
      }

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
        throw new Error(`Không tìm thấy khai báo giảng dạy với ID ${assignmentId}`);
      }

      const oldLessons = assignment.completedLessons;
      const newLessons = lessonsPerWeek * numberOfWeeks;
      const lessonDifference = newLessons - oldLessons;

      const classSubject = assignment.class.subjects.find(
        s => s.subject.toString() === assignment.subject._id.toString()
      );

      const existingAssignments = await TeacherAssignment.find({
        class: assignment.class._id,
        subject: assignment.subject._id,
        _id: { $ne: assignmentId }
      }).session(session);

      const totalAssignedLessons = existingAssignments.reduce(
        (sum, a) => sum + a.completedLessons,
        0
      );

      if (totalAssignedLessons + newLessons > classSubject.lessonCount) {
        throw new Error(
          `Tổng số tiết (${totalAssignedLessons + newLessons}) vượt quá số tiết cho phép (${classSubject.lessonCount}) cho assignment ${assignmentId}`
        );
      }

      assignment.lessonsPerWeek = lessonsPerWeek;
      assignment.numberOfWeeks = numberOfWeeks;
      assignment.completedLessons = newLessons;
      await assignment.save({ session });

      await Teacher.findByIdAndUpdate(
        assignment.teacher._id,
        { $inc: { totalAssignment: lessonDifference } },
        { session }
      );

      await Department.findByIdAndUpdate(
        assignment.subject.department._id,
        { $inc: { declaredTeachingLessons: lessonDifference } },
        { session }
      );
    }

    await session.commitTransaction();
    res.status(200).json({ message: "Cập nhật các khai báo giảng dạy thành công" });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

// Thêm endpoint xóa nhiều assignments
assignmentRouter.delete('/batch-delete', isAuth, isToTruong, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { assignmentIds } = req.body;

    if (!Array.isArray(assignmentIds)) {
      throw new Error('Dữ liệu không hợp lệ');
    }

    for (const assignmentId of assignmentIds) {
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
        throw new Error(`Không tìm thấy khai báo giảng dạy với ID ${assignmentId}`);
      }

      await TeacherAssignment.findByIdAndDelete(assignmentId).session(session);

      await Teacher.findByIdAndUpdate(
        assignment.teacher._id,
        { $inc: { totalAssignment: -assignment.completedLessons } },
        { session }
      );

      await Department.findByIdAndUpdate(
        assignment.subject.department._id,
        { $inc: { declaredTeachingLessons: -assignment.completedLessons } },
        { session }
      );
    }

    await session.commitTransaction();
    res.status(200).json({ message: "Xóa các khai báo giảng dạy thành công" });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

export default assignmentRouter;