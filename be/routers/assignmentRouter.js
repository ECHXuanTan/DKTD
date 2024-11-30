import express from 'express';
import mongoose from 'mongoose';
import { isAuth, isToTruong } from '../utils.js';
import TeacherAssignment from '../models/teacherAssignmentModels.js';
import Class from '../models/classModels.js';
import Teacher from '../models/teacherModel.js';
import Department from '../models/departmentModel.js';
import Subject from '../models/subjectModels.js';
import Result from '../models/resultModel.js';

const assignmentRouter = express.Router();

const sortClasses = (a, b) => {
  if (a.grade !== b.grade) {
    return a.grade - b.grade;
  }
  return a.className.localeCompare(b.className, 'vi', { sensitivity: 'base' });
};

assignmentRouter.post('/assign', isAuth, isToTruong, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { assignments } = req.body;
    
    if (!Array.isArray(assignments) || assignments.length === 0) {
      throw new Error('Dữ liệu không hợp lệ');
    }

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
        completedLessons: curr.completedLessons
      });
      return acc;
    }, {});

    for (const group of Object.values(groupedAssignments)) {
      const { classId, subjectId, assignments: groupAssignments } = group;

      const classData = await Class.findById(classId)
        .populate('subjects.subject')
        .session(session);
      
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
        s => s.subject._id.toString() === subjectId
      );
      if (!subjectData) {
        throw new Error(`Không tìm thấy môn học ${subject.name} trong lớp ${classData.name}`);
      }

      const existingAssignments = await TeacherAssignment.find({
        class: classId,
        subject: subjectId
      }).populate('teacher').session(session);

      // Check if any teacher already has assignment in the class
      for (const newAssignment of groupAssignments) {
        const existingTeacherAssignment = existingAssignments.find(
          ea => ea.teacher._id.toString() === newAssignment.teacherId
        );
        
        if (existingTeacherAssignment) {
          throw new Error(
            `Giáo viên "${existingTeacherAssignment.teacher.name}" đã được phân công cho lớp ${classData.name}`
          );
        }
      }

      const totalExistingLessons = existingAssignments.reduce(
        (sum, assignment) => sum + assignment.completedLessons,
        0
      );

      const totalNewLessons = groupAssignments.reduce(
        (sum, assignment) => {
          if (assignment.completedLessons < 0) {
            throw new Error('Số tiết không thể là số âm');
          }
          return sum + assignment.completedLessons;
        },
        0
      );
      
      if (totalExistingLessons + totalNewLessons > subjectData.lessonCount) {
        throw new Error(
          `Tổng số tiết (${totalExistingLessons + totalNewLessons}) vượt quá số tiết cho phép (${subjectData.lessonCount}) của môn ${subject.name} trong lớp ${classData.name}`
        );
      }

      for (const assignment of groupAssignments) {
        const teacher = await Teacher.findById(assignment.teacherId)
          .populate('department')
          .session(session);
          
        if (!teacher) {
          throw new Error(`Không tìm thấy giáo viên với ID ${assignment.teacherId}`);
        }

        const declaredLessons = subject.isSpecialized ? assignment.completedLessons * 3 : assignment.completedLessons;

        const newAssignment = await TeacherAssignment.create([{
          teacher: assignment.teacherId,
          class: classId,
          subject: subjectId,
          completedLessons: assignment.completedLessons
        }], { session });

        await Teacher.findByIdAndUpdate(
          assignment.teacherId,
          { 
            $inc: { 
              totalAssignment: assignment.completedLessons,
              declaredTeachingLessons: declaredLessons
            } 
          },
          { session }
        );

        await Department.findByIdAndUpdate(
          subject.department._id,
          { $inc: { declaredTeachingLessons: assignment.completedLessons } },
          { session }
        );

        const result = new Result({
          action: 'CREATE',
          user: req.user._id,
          entityType: 'TeacherAssignment',
          entityId: newAssignment[0]._id,
          dataAfter: newAssignment[0]
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

assignmentRouter.post('/bulk-assign', isAuth, isToTruong, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { assignments } = req.body;
    
    if (!Array.isArray(assignments) || assignments.length === 0) {
      throw new Error('Dữ liệu không hợp lệ');
    }

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
        completedLessons: curr.completedLessons
      });
      return acc;
    }, {});

    for (const group of Object.values(groupedAssignments)) {
      const { classId, subjectId, assignments: groupAssignments } = group;

      const classData = await Class.findById(classId)
        .populate('subjects.subject')
        .session(session);
      
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
        s => s.subject._id.toString() === subjectId
      );
      if (!subjectData) {
        throw new Error(`Không tìm thấy môn học ${subject.name} trong lớp ${classData.name}`);
      }

      // Get existing assignments
      const existingAssignments = await TeacherAssignment.find({
        class: classId,
        subject: subjectId
      }).populate('teacher').session(session);

      // Check if any teacher already has assignment in the class
      for (const newAssignment of groupAssignments) {
        const existingTeacherAssignment = existingAssignments.find(
          ea => ea.teacher._id.toString() === newAssignment.teacherId
        );
        
        if (existingTeacherAssignment) {
          throw new Error(
            `Giáo viên "${existingTeacherAssignment.teacher.name}" đã được phân công cho lớp ${classData.name}`
          );
        }
      }

      const totalExistingLessons = existingAssignments.reduce(
        (sum, assignment) => sum + assignment.completedLessons,
        0
      );

      const totalNewLessons = groupAssignments.reduce(
        (sum, assignment) => {
          if (assignment.completedLessons < 0) {
            throw new Error('Số tiết không thể là số âm');
          }
          return sum + assignment.completedLessons;
        },
        0
      );
      
      if (totalExistingLessons + totalNewLessons > subjectData.lessonCount) {
        throw new Error(
          `Tổng số tiết (${totalExistingLessons + totalNewLessons}) vượt quá số tiết cho phép (${subjectData.lessonCount}) của môn ${subject.name} trong lớp ${classData.name}`
        );
      }

      for (const assignment of groupAssignments) {
        const teacher = await Teacher.findById(assignment.teacherId)
          .populate('department')
          .session(session);
          
        if (!teacher) {
          throw new Error(`Không tìm thấy giáo viên với ID ${assignment.teacherId}`);
        }

        const declaredLessons = subject.isSpecialized ? assignment.completedLessons * 3 : assignment.completedLessons;

        const newAssignment = await TeacherAssignment.create([{
          teacher: assignment.teacherId,
          class: classId,
          subject: subjectId,
          completedLessons: assignment.completedLessons
        }], { session });

        await Teacher.findByIdAndUpdate(
          assignment.teacherId,
          { 
            $inc: { 
              totalAssignment: assignment.completedLessons,
              declaredTeachingLessons: declaredLessons
            } 
          },
          { session }
        );

        await Department.findByIdAndUpdate(
          subject.department._id,
          { $inc: { declaredTeachingLessons: assignment.completedLessons } },
          { session }
        );

        const result = new Result({
          action: 'CREATE',
          user: req.user._id,
          entityType: 'TeacherAssignment',
          entityId: newAssignment[0]._id,
          dataAfter: newAssignment[0]
        });
        await result.save({ session });
      }
    }

    await session.commitTransaction();
    res.status(200).json({ message: 'Phân công giảng dạy hàng loạt thành công' });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

assignmentRouter.post('/bulk-assign-by-teacher', isAuth, isToTruong, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { assignments } = req.body;
    
    if (!Array.isArray(assignments) || assignments.length === 0) {
      throw new Error('Dữ liệu không hợp lệ');
    }

    // Validate và nhóm dữ liệu theo lớp-môn học
    const groupedByClassSubject = {};

    // Duyệt qua từng giáo viên và các lớp được phân công
    for (const teacherAssignment of assignments) {
      const { teacherId, classes } = teacherAssignment;

      if (!Array.isArray(classes)) {
        throw new Error('Dữ liệu phân công lớp không hợp lệ');
      }

      // Kiểm tra giáo viên tồn tại
      const teacher = await Teacher.findById(teacherId)
        .populate('department')
        .session(session);

      if (!teacher) {
        throw new Error(`Không tìm thấy giáo viên với ID ${teacherId}`);
      }

      // Xử lý từng lớp được phân công
      for (const classAssignment of classes) {
        const { classId, subjectId, completedLessons } = classAssignment;

        if (completedLessons < 0) {
          throw new Error('Số tiết không thể là số âm');
        }

        // Kiểm tra xem giáo viên đã được phân công cho lớp này chưa
        const existingTeacherAssignment = await TeacherAssignment.findOne({
          teacher: teacherId,
          class: classId,
          subject: subjectId
        }).populate('class subject').session(session);

        if (existingTeacherAssignment) {
          throw new Error(
            `Giáo viên "${teacher.name}" đã được phân công dạy môn ${existingTeacherAssignment.subject.name} trong lớp ${existingTeacherAssignment.class.name}`
          );
        }

        const key = `${classId}-${subjectId}`;
        if (!groupedByClassSubject[key]) {
          groupedByClassSubject[key] = {
            classId,
            subjectId,
            assignments: [],
            totalAssignedLessons: 0
          };
        }

        groupedByClassSubject[key].assignments.push({
          teacherId,
          completedLessons
        });
        groupedByClassSubject[key].totalAssignedLessons += completedLessons;
      }
    }

    // Kiểm tra giới hạn số tiết cho mỗi cặp lớp-môn học
    for (const key in groupedByClassSubject) {
      const { classId, subjectId, totalAssignedLessons, assignments } = groupedByClassSubject[key];

      // Lấy thông tin lớp học
      const classData = await Class.findById(classId)
        .populate('subjects.subject')
        .session(session);

      if (!classData) {
        throw new Error(`Không tìm thấy lớp học với ID ${classId}`);
      }

      // Lấy thông tin môn học
      const subject = await Subject.findById(subjectId)
        .populate('department')
        .session(session);

      if (!subject) {
        throw new Error(`Không tìm thấy môn học với ID ${subjectId}`);
      }

      // Kiểm tra môn học có trong lớp
      const subjectData = classData.subjects.find(
        s => s.subject._id.toString() === subjectId
      );

      if (!subjectData) {
        throw new Error(`Không tìm thấy môn học ${subject.name} trong lớp ${classData.name}`);
      }

      // Lấy các assignment hiện có
      const existingAssignments = await TeacherAssignment.find({
        class: classId,
        subject: subjectId
      }).session(session);

      const existingLessons = existingAssignments.reduce(
        (sum, assignment) => sum + assignment.completedLessons,
        0
      );

      // Kiểm tra tổng số tiết
      if (existingLessons + totalAssignedLessons > subjectData.lessonCount) {
        throw new Error(
          `Tổng số tiết (${existingLessons + totalAssignedLessons}) vượt quá số tiết cho phép (${subjectData.lessonCount}) của môn ${subject.name} trong lớp ${classData.name}`
        );
      }

      // Tạo các assignment mới và cập nhật thông tin liên quan
      for (const assignment of assignments) {
        const { teacherId, completedLessons } = assignment;

        // Tính số tiết quy đổi nếu là môn chuyên
        const declaredLessons = subject.isSpecialized ? completedLessons * 3 : completedLessons;

        // Tạo assignment mới
        const newAssignment = await TeacherAssignment.create([{
          teacher: teacherId,
          class: classId,
          subject: subjectId,
          completedLessons
        }], { session });

        // Cập nhật thông tin giáo viên
        await Teacher.findByIdAndUpdate(
          teacherId,
          { 
            $inc: { 
              totalAssignment: completedLessons,
              declaredTeachingLessons: declaredLessons
            } 
          },
          { session }
        );

        // Cập nhật thông tin tổ bộ môn
        await Department.findByIdAndUpdate(
          subject.department._id,
          { $inc: { declaredTeachingLessons: completedLessons } },
          { session }
        );

        // Lưu lịch sử
        const result = new Result({
          action: 'CREATE',
          user: req.user._id,
          entityType: 'TeacherAssignment',
          entityId: newAssignment[0]._id,
          dataAfter: newAssignment[0]
        });
        await result.save({ session });
      }
    }

    await session.commitTransaction();
    res.status(200).json({ message: 'Phân công giảng dạy hàng loạt thành công' });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

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

    const oldAssignment = assignment.toObject();
    const oldLessons = assignment.completedLessons;
    const oldDeclaredLessons = assignment.subject.isSpecialized ? oldLessons * 3 : oldLessons;
    
    const newLessons = lessonsPerWeek * numberOfWeeks;
    const lessonDifference = newLessons - oldLessons;
    const newDeclaredLessons = assignment.subject.isSpecialized ? newLessons * 3 : newLessons;
    const declaredLessonsDifference = newDeclaredLessons - oldDeclaredLessons;

    const classSubject = assignment.class.subjects.find(
      s => s.subject.toString() === assignment.subject._id.toString()
    );
    if (!classSubject) {
      throw new Error('Không tìm thấy thông tin môn học trong lớp');
    }

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
        `Tổng số tiết (${totalAssignedLessons + newLessons}) vượt quá số tiết cho phép (${classSubject.lessonCount})`
      );
    }

    assignment.lessonsPerWeek = lessonsPerWeek;
    assignment.numberOfWeeks = numberOfWeeks;
    assignment.completedLessons = newLessons;
    const updatedAssignment = await assignment.save({ session });

    await Teacher.findByIdAndUpdate(
      assignment.teacher._id,
      { 
        $inc: { 
          totalAssignment: lessonDifference,
          declaredTeachingLessons: declaredLessonsDifference
        } 
      },
      { session }
    );

    await Department.findByIdAndUpdate(
      assignment.subject.department._id,
      { $inc: { declaredTeachingLessons: lessonDifference } },
      { session }
    );

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

assignmentRouter.delete('/batch-delete', isAuth, isToTruong, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { assignments: assignmentIds } = req.body;

    if (!Array.isArray(assignmentIds)) {
      throw new Error('Dữ liệu không hợp lệ');
    }

    for (const assignmentId of assignmentIds) {
      const foundAssignment = await TeacherAssignment.findById(assignmentId)
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

      if (!foundAssignment) {
        throw new Error(`Không tìm thấy khai báo giảng dạy với ID ${assignmentId}`);
      }

      const { completedLessons } = foundAssignment;
      const declaredLessons = foundAssignment.subject.isSpecialized ? completedLessons * 3 : completedLessons;

      await TeacherAssignment.findByIdAndDelete(assignmentId).session(session);

      await Teacher.findByIdAndUpdate(
        foundAssignment.teacher._id,
        { 
          $inc: { 
            totalAssignment: -completedLessons,
            declaredTeachingLessons: -declaredLessons
          } 
        },
        { session }
      );

      await Department.findByIdAndUpdate(
        foundAssignment.subject.department._id,
        { $inc: { declaredTeachingLessons: -completedLessons } },
        { session }
      );
    }

    await session.commitTransaction();
    res.status(200).json({ 
      success: true,
      message: "Xóa các khai báo giảng dạy thành công" 
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  } finally {
    session.endSession();
  }
});

assignmentRouter.put('/batch-edit', isAuth, isToTruong, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { assignments } = req.body;
    
    if (!Array.isArray(assignments)) {
      throw new Error('Dữ liệu không hợp lệ');
    }

    const assignmentIds = assignments.map(a => a.assignmentId);
    const assignmentsToUpdate = await TeacherAssignment.find({
      _id: { $in: assignmentIds }
    })
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

    const updatesMap = new Map(
      assignments.map(a => [a.assignmentId, a])
    );

    const groupedAssignments = assignmentsToUpdate.reduce((acc, curr) => {
      const key = `${curr.class._id}-${curr.subject._id}`;
      if (!acc[key]) {
        acc[key] = {
          classId: curr.class._id,
          subjectId: curr.subject._id,
          assignments: [],
          maxLessons: curr.class.subjects.find(
            s => s.subject.toString() === curr.subject._id.toString()
          ).lessonCount
        };
      }
      acc[key].assignments.push(curr);
      return acc;
    }, {});

    for (const group of Object.values(groupedAssignments)) {
      const { classId, subjectId, maxLessons, assignments: groupAssignments } = group;

      const otherAssignments = await TeacherAssignment.find({
        class: classId,
        subject: subjectId,
        _id: { $nin: assignmentIds }
      }).session(session);

      const otherLessonsTotal = otherAssignments.reduce(
        (sum, a) => sum + a.completedLessons,
        0
      );

      const newLessonsTotal = groupAssignments.reduce((sum, assignment) => {
        const updateInfo = updatesMap.get(assignment._id.toString());
        if (!updateInfo) return sum;
        if (updateInfo.completedLessons < 0) {
          throw new Error('Số tiết không thể là số âm');
        }
        return sum + updateInfo.completedLessons;
      }, 0);

      if (otherLessonsTotal + newLessonsTotal > maxLessons) {
        throw new Error(
          `Tổng số tiết (${otherLessonsTotal + newLessonsTotal}) vượt quá số tiết cho phép (${maxLessons})`
        );
      }
    }

    for (const assignment of assignmentsToUpdate) {
      const updateInfo = updatesMap.get(assignment._id.toString());
      const oldLessons = assignment.completedLessons;
      const oldDeclaredLessons = assignment.subject.isSpecialized ? oldLessons * 3 : oldLessons;

      const newLessons = updateInfo.completedLessons;
      const lessonDifference = newLessons - oldLessons;
      const newDeclaredLessons = assignment.subject.isSpecialized ? newLessons * 3 : newLessons;
      const declaredLessonsDifference = newDeclaredLessons - oldDeclaredLessons;

      assignment.completedLessons = newLessons;
      await assignment.save({ session });

      await Teacher.findByIdAndUpdate(
        assignment.teacher._id,
        { 
          $inc: { 
            totalAssignment: lessonDifference,
            declaredTeachingLessons: declaredLessonsDifference
          } 
        },
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

assignmentRouter.delete('/batch-delete', isAuth, isToTruong, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { assignments } = req.body;

    if (!Array.isArray(assignments)) {
      throw new Error('Dữ liệu không hợp lệ');
    }

    for (const assignment of assignments) {
      const { assignmentId, completedLessons } = assignment;
      
      const foundAssignment = await TeacherAssignment.findById(assignmentId)
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

      if (!foundAssignment) {
        throw new Error(`Không tìm thấy khai báo giảng dạy với ID ${assignmentId}`);
      }

      if (foundAssignment.completedLessons !== completedLessons) {
        throw new Error(`Số tiết đã hoàn thành không khớp với dữ liệu hiện tại cho assignment ${assignmentId}`);
      }

      const declaredLessons = foundAssignment.subject.isSpecialized ? completedLessons * 3 : completedLessons;

      await TeacherAssignment.findByIdAndDelete(assignmentId).session(session);

      await Teacher.findByIdAndUpdate(
        foundAssignment.teacher._id,
        { 
          $inc: { 
            totalAssignment: -completedLessons,
            declaredTeachingLessons: -declaredLessons
          } 
        },
        { session }
      );

      await Department.findByIdAndUpdate(
        foundAssignment.subject.department._id,
        { $inc: { declaredTeachingLessons: -completedLessons } },
        { session }
      );
    }

    await session.commitTransaction();
    res.status(200).json({ 
      success: true,
      message: "Xóa các khai báo giảng dạy thành công" 
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
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
      lessonsPerWeek: assignment.lessonsPerWeek || 0,
      numberOfWeeks: assignment.numberOfWeeks || 0
    }));

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

// Endpoint xóa tất cả assignment
assignmentRouter.delete('/delete-all', isAuth, isToTruong, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Lấy danh sách tất cả assignment để lưu vào Results
    const allAssignments = await TeacherAssignment.find()
      .populate('class')
      .populate({
        path: 'subject',
        populate: { path: 'department' }
      })
      .populate('teacher')
      .session(session);

    // Lưu trạng thái trước khi xóa vào Results
    const results = allAssignments.map(assignment => ({
      action: 'DELETE',
      user: req.user._id,
      entityType: 'TeacherAssignment',
      entityId: assignment._id,
      dataBefore: {
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
    }));

    // Lưu kết quả vào Results collection
    if (results.length > 0) {
      await Result.insertMany(results, { session });
    }

    // Reset tất cả các giá trị liên quan của Teacher về 0
    await Teacher.updateMany(
      {},
      {
        $set: {
          totalAssignment: 0,
          declaredTeachingLessons: 0,
          lessonsPerWeek: 0,
          teachingWeeks: 0,
          reductions: [],
          totalReducedLessons: 0
        }
      },
      { session }
    );

    // Reset tất cả các giá trị liên quan của Department về 0
    await Department.updateMany(
      {},
      {
        $set: {
          totalAssignmentTime: 0,
          declaredTeachingLessons: 0
        }
      },
      { session }
    );

    // Xóa tất cả assignment
    await TeacherAssignment.deleteMany({}, { session });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Đã xóa tất cả phân công và reset dữ liệu liên quan",
      deletedCount: allAssignments.length
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error deleting all assignments:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Có lỗi xảy ra khi xóa dữ liệu'
    });
  } finally {
    session.endSession();
  }
});

export default assignmentRouter;