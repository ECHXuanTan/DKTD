import express from 'express';
import mongoose from 'mongoose';
import Class from '../models/classModels.js';
import Subject from '../models/subjectModels.js';
import Department from '../models/departmentModel.js';
import Teacher from '../models/teacherModel.js';
import TeacherAssignment from '../models/teacherAssignmentModels.js';
import Result from '../models/resultModel.js';
import Homeroom from '../models/homeroomModel.js';
import { isAuth } from '../utils.js';

const classRouter = express.Router();

// Helper function to sort classes
const sortClasses = (a, b) => {
  if (a.grade !== b.grade) {
    return a.grade - b.grade;
  }
  return a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' });
};

classRouter.get('/classes', isAuth, async (req, res) => {
  try {
    const homeroomAssignments = await Homeroom.find().lean();
    const homeroomMap = homeroomAssignments.reduce((acc, homeroom) => {
      acc[homeroom.class.toString()] = {
        teacherId: homeroom.teacher.toString(),
        reducedLessonsPerWeek: homeroom.reducedLessonsPerWeek,
        reducedWeeks: homeroom.reducedWeeks,
        totalReducedLessons: homeroom.totalReducedLessons
      };
      return acc;
    }, {});

    const teachers = await Teacher.find().select('_id name').lean();
    const teacherMap = teachers.reduce((acc, teacher) => {
      acc[teacher._id.toString()] = teacher.name;
      return acc;
    }, {});

    const classes = await Class.find()
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
      const homeroomInfo = homeroomMap[classItem._id.toString()];
      const homeroomTeacher = homeroomInfo ? teacherMap[homeroomInfo.teacherId] : null;
      return {
        ...classItem,
        homeroomTeacher: homeroomTeacher || null,
        subjects: (classItem.subjects || []).concat(
          homeroomTeacher ? [{
            subject: {
              name: "CCSHL"
            },
            lessonCount: homeroomInfo.totalReducedLessons || 72
          }] : []
        )
      };
    });

    const sortedClasses = classesWithExtraInfo.sort(sortClasses);

    res.status(200).json(sortedClasses);
  } catch (error) {
    console.error('Error in GET /classes:', error);
    res.status(500).json({ message: "Lỗi khi lấy danh sách lớp học", error: error.message });
  }
});

classRouter.get('/classes-without-homeroom', isAuth, async (req, res) => {
  try {
    const homeroomAssignments = await Homeroom.find().select('class').lean();
    const assignedClassIds = homeroomAssignments.map(h => h.class.toString());

    const unassignedClasses = await Class.find({
      _id: { $nin: assignedClassIds }
    }).select('_id name grade').lean();

    const sortedUnassignedClasses = unassignedClasses.sort(sortClasses);

    res.status(200).json(sortedUnassignedClasses);
  } catch (error) {
    console.error('Error fetching classes without homeroom:', error);
    res.status(500).json({ message: "Lỗi khi lấy danh sách lớp chưa được chỉ định chủ nhiệm", error: error.message });
  }
});

classRouter.get('/:id', isAuth, async (req, res) => {
  try {
    const classId = req.params.id;
    const classData = await Class.findById(classId)
      .populate({
        path: 'subjects.subject',
        select: 'name',
      })
      .lean();

    if (!classData) {
      return res.status(404).json({ message: "Không tìm thấy lớp học với ID đã cung cấp" });
    }

    const homeroomAssignment = await Homeroom.findOne({ class: classId }).populate('teacher', 'name').lean();

    if (homeroomAssignment) {
      classData.homeroomTeacher = homeroomAssignment.teacher.name;
      classData.subjects.push({
        subject: {
          name: "CCSHL"
        },
        lessonCount: homeroomAssignment.totalReducedLessons || 72
      });
    }

    res.status(200).json(classData);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy thông tin lớp học", error: error.message });
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

    const homeroomAssignments = await Homeroom.find().populate('teacher', 'name').lean();
    const homeroomMap = homeroomAssignments.reduce((acc, homeroom) => {
      acc[homeroom.class.toString()] = {
        teacherName: homeroom.teacher.name,
        totalReducedLessons: homeroom.totalReducedLessons || 72
      };
      return acc;
    }, {});

    const classesWithHomeroom = classes.map(classItem => {
      const homeroomInfo = homeroomMap[classItem._id.toString()];
      if (homeroomInfo) {
        classItem.homeroomTeacher = homeroomInfo.teacherName;
        classItem.subjects.push({
          subject: { name: "CCSHL" },
          lessonCount: homeroomInfo.totalReducedLessons
        });
      }
      return classItem;
    });

    const sortedClasses = classesWithHomeroom.sort(sortClasses);

    res.json(sortedClasses);
  } catch (error) {
    res.status(500).json({ message: "Error fetching department classes", error: error.message });
  }
});

classRouter.get('/by-subject/:subjectId', isAuth, async (req, res) => {
  try {
    const { subjectId } = req.params;

    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: 'Không tìm thấy môn học với ID đã cung cấp' });
    }

    const classes = await Class.aggregate([
      {
        $match: {
          'subjects.subject': new mongoose.Types.ObjectId(subjectId)
        }
      },
      {
        $project: {
          name: 1,
          grade: 1,
          campus: 1,
          isSpecial: 1,
          subject: {
            $filter: {
              input: '$subjects',
              as: 'subject',
              cond: { $eq: ['$$subject.subject', new mongoose.Types.ObjectId(subjectId)] }
            }
          }
        }
      },
      {
        $unwind: {
          path: '$subject',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          name: 1,
          grade: 1,
          campus: 1,
          isSpecial: 1,
          lessonCount: '$subject.lessonCount',
          maxTeachers: '$subject.maxTeachers'
        }
      }
    ]);

    const homeroomAssignments = await Homeroom.find().populate('teacher', 'name').lean();
    const homeroomMap = homeroomAssignments.reduce((acc, homeroom) => {
      if (homeroom.teacher && homeroom.class) {
        acc[homeroom.class.toString()] = {
          teacherName: homeroom.teacher.name,
          totalReducedLessons: homeroom.totalReducedLessons || 72
        };
      }
      return acc;
    }, {});

    const classesWithHomeroom = classes.map(classItem => {
      const homeroomInfo = homeroomMap[classItem._id?.toString()];
      if (homeroomInfo) {
        classItem.homeroomTeacher = homeroomInfo.teacherName;
        if (subject && subject.name === "CCSHL") {
          classItem.lessonCount = homeroomInfo.totalReducedLessons;
        }
      }
      return classItem;
    });

    const sortedClasses = classesWithHomeroom.sort(sortClasses);

    res.status(200).json({
      subject: subject.name,
      classes: sortedClasses
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy danh sách lớp học theo môn học', error: error.message });
  }
});

classRouter.post('/create-class', isAuth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name, grade, campus, subjects, size } = req.body;

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
      size,
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

    const resultData = {
      action: 'CREATE',
      user: req.user._id,
      entityType: 'Class',
      entityId: newClass._id,
      dataAfter: newClass
    };

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
      const { name, grade, campus, size, ...subjectData } = classData;
      
      if (!name || !grade || !campus || !size) {
        throw new Error(`Thiếu thông tin cơ bản cho lớp: ${name || 'Unknown'}`);
      }

      const subjects = [];
      for (const [subjectName, lessonCount] of Object.entries(subjectData)) {
        if (lessonCount && parseInt(lessonCount, 10) > 0) {
          const subject = await Subject.findOne({ name: subjectName });
          if (!subject) {
            throw new Error(`Không tìm thấy môn học: ${subjectName}`);
          }
          subjects.push({
            subject: subject._id,
            lessonCount: parseInt(lessonCount, 10)
          });
        }
      }

      return { 
        name, 
        grade: parseInt(grade, 10), 
        campus, 
        size: parseInt(size, 10),
        subjects
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

classRouter.post('/add-subjects-to-classes', isAuth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const classesData = req.body.classes;
    if (!Array.isArray(classesData) || classesData.length === 0) {
      throw new Error('Dữ liệu không hợp lệ');
    }

    // Find all classes and subjects referenced in the request
    const classNames = classesData.map(c => c.name);
    const allClasses = await Class.find({ name: { $in: classNames } }).session(session);
    if (allClasses.length !== classesData.length) {
      const notFoundClasses = classNames.filter(name => !allClasses.some(c => c.name === name));
      throw new Error(`Không tìm thấy các lớp học sau: ${notFoundClasses.join(', ')}`);
    }

    const allSubjectNames = Array.from(new Set(classesData.flatMap(c => Object.keys(c).filter(k => k !== 'name'))));
    const allSubjects = await Subject.find({ name: { $in: allSubjectNames } }).populate('department').session(session);
    if (allSubjects.length !== allSubjectNames.length) {
      const notFoundSubjects = allSubjectNames.filter(name => !allSubjects.some(subject => subject.name === name));
      throw new Error(`Không tìm thấy các môn học sau: ${notFoundSubjects.join(', ')}`);
    }

    // Map subjects for easy access
    const subjectMap = allSubjects.reduce((acc, subject) => {
      acc[subject.name] = subject;
      return acc;
    }, {});

    const errors = [];

    // Validate all data before making any changes
    for (const classData of classesData) {
      const { name, ...subjects } = classData;

      const classToUpdate = allClasses.find(c => c.name === name);
      if (!classToUpdate) {
        errors.push(`Lớp ${name}: Không tìm thấy lớp học`);
        continue;
      }

      for (const [subjectName, lessonCount] of Object.entries(subjects)) {
        if (!lessonCount || parseInt(lessonCount, 10) <= 0) {
          errors.push(`Lớp ${name}, Môn ${subjectName}: Số tiết không hợp lệ`);
          continue;
        }

        const subject = subjectMap[subjectName];
        if (!subject) {
          errors.push(`Lớp ${name}, Môn ${subjectName}: Không tìm thấy môn học`);
          continue;
        }

        const existingSubject = classToUpdate.subjects.find(s => s.subject.toString() === subject._id.toString());
        if (existingSubject && parseInt(lessonCount, 10) < existingSubject.lessonCount) {
          const existingAssignment = await TeacherAssignment.findOne({
            class: classToUpdate._id,
            subject: subject._id
          }).session(session);

          if (existingAssignment) {
            errors.push(`Lớp ${name}, Môn ${subjectName}: Không thể giảm số tiết cho môn học đã được phân công giảng dạy`);
          }
        }
      }
    }

    // If there are any errors, abort the transaction and return the errors
    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }

    // If no errors, proceed with updates
    const updatedClasses = [];
    for (const classData of classesData) {
      const { name, ...subjects } = classData;
      const classToUpdate = allClasses.find(c => c.name === name);
      
      const classBefore = classToUpdate.toObject();

      for (const [subjectName, lessonCount] of Object.entries(subjects)) {
        const subject = subjectMap[subjectName];
        const existingSubjectIndex = classToUpdate.subjects.findIndex(s => s.subject.toString() === subject._id.toString());
        
        if (existingSubjectIndex !== -1) {
          const oldLessonCount = classToUpdate.subjects[existingSubjectIndex].lessonCount;
          classToUpdate.subjects[existingSubjectIndex].lessonCount = parseInt(lessonCount, 10);
          
          if (subject.department) {
            await Department.findByIdAndUpdate(
              subject.department._id,
              { $inc: { totalAssignmentTime: parseInt(lessonCount, 10) - oldLessonCount } },
              { session }
            );
          }
        } else {
          classToUpdate.subjects.push({
            subject: subject._id,
            lessonCount: parseInt(lessonCount, 10)
          });
          
          if (subject.department) {
            await Department.findByIdAndUpdate(
              subject.department._id,
              { $inc: { totalAssignmentTime: parseInt(lessonCount, 10) } },
              { session }
            );
          }
        }
      }

      await classToUpdate.save({ session });

      const result = new Result({
        action: 'UPDATE',
        user: req.user._id,
        entityType: 'Class',
        entityId: classToUpdate._id,
        dataBefore: classBefore,
        dataAfter: classToUpdate.toObject()
      });

      await result.save({ session });

      updatedClasses.push(classToUpdate.name);
    }

    await session.commitTransaction();
    res.status(200).json({ message: "Hoàn tất thêm/cập nhật môn học cho các lớp", updatedClasses });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
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

    const dataAfter = {
      ...classToUpdate.toObject(),
      subjects: classToUpdate.subjects.map(s => ({
        subject: s.subject._id,
        subjectName: s.subject.name,
        lessonCount: s.lessonCount
      }))
    };

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

    const homeroomAssignment = await Homeroom.findOne({ class: id }).session(session);
    if (homeroomAssignment) {
      throw new Error('Không thể xóa lớp học đang có giáo viên chủ nhiệm');
    }

    const existingAssignments = await TeacherAssignment.findOne({ class: id }).session(session);
    if (existingAssignments) {
      throw new Error('Không thể xóa lớp học đã có môn được phân công giảng dạy');
    }

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

    const result = new Result({
      action: 'DELETE',
      user: req.user._id,
      entityType: 'Class',
      entityId: id,
      dataBefore: detailedClassData,
      dataAfter: null
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

    const oldLessonCount = classToUpdate.subjects[subjectIndex].lessonCount;

    // Check if the new lesson count is less than the old one
    if (lessonCount < oldLessonCount) {
      // Check if the subject has been assigned to a teacher
      const existingAssignment = await TeacherAssignment.findOne({
        class: id,
        subject: subjectId
      }).session(session);

      if (existingAssignment) {
        throw new Error('Không thể giảm số tiết cho môn học đã được phân công giảng dạy');
      }
    }

    const classBefore = {
      ...classToUpdate.toObject(),
      subjects: classToUpdate.subjects.map(s => ({
        subject: s.subject._id,
        subjectName: s.subject.name,
        lessonCount: s.lessonCount
      }))
    };

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

    const dataAfter = {
      ...classToUpdate.toObject(),
      subjects: classToUpdate.subjects.map(s => ({
        subject: s.subject._id,
        subjectName: s.subject.name,
        lessonCount: s.lessonCount
      }))
    };

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