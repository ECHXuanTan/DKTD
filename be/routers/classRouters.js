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

// Enhanced helper function to sort classes by name and grade
const sortClasses = (a, b) => {
  // Extract numeric part and letter part from class names
  const parseClassName = (name) => {
    const match = name.match(/(\d+)([A-Za-z]+)/);
    if (match) {
      return {
        number: parseInt(match[1]),
        letter: match[2].toLowerCase()
      };
    }
    return { number: 0, letter: name.toLowerCase() };
  };

  const classA = parseClassName(a.name);
  const classB = parseClassName(b.name);

  if (a.grade !== b.grade) {
    return a.grade - b.grade;
  }
  
  if (classA.number !== classB.number) {
    return classA.number - classB.number;
  }
  
  return classA.letter.localeCompare(classB.letter);
};

// GET /classes
classRouter.get('/classes', isAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const search = req.query.search || '';
    const grade = req.query.grade || '';
    const subjectId = req.query.subjectId || '';

    // Build filter object
    const filter = {};
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }
    if (grade) {
      filter.grade = parseInt(grade);
    }
    if (subjectId) {
      filter['subjects.subject'] = new mongoose.Types.ObjectId(subjectId);
    }

    // Get total count for pagination
    const total = await Class.countDocuments(filter);

    // Only fetch homeroom assignments for the current page
    const skip = (page - 1) * limit;
    
    // Fetch classes with pagination
    const classes = await Class.find(filter)
      .select('name grade campus size subjects updatedAt')
      .populate({
        path: 'subjects.subject',
        select: 'name department',
        populate: {
          path: 'department',
          select: 'name'
        }
      })
      .skip(skip)
      .limit(limit)
      .lean();

    // Fetch homeroom data only for classes on current page
    const classIds = classes.map(c => c._id);
    const homeroomAssignments = await Homeroom.find({ class: { $in: classIds } })
      .select('class teacher reducedLessonsPerWeek reducedWeeks totalReducedLessons')
      .populate('teacher', 'name')
      .lean();

    const homeroomMap = new Map(homeroomAssignments.map(h => [
      h.class.toString(),
      {
        teacherName: h.teacher.name,
        totalReducedLessons: h.totalReducedLessons || 72
      }
    ]));

    // Process classes with homeroom data
    const processedClasses = classes.map(classItem => {
      const homeroomInfo = homeroomMap.get(classItem._id.toString());
      const processedSubjects = classItem.subjects.map(subject => ({
        subject: {
          _id: subject.subject._id,
          name: subject.subject.name,
          department: subject.subject.department ? {
            _id: subject.subject.department._id,
            name: subject.subject.department.name
          } : null
        },
        periodsPerWeek: subject.periodsPerWeek,
        numberOfWeeks: subject.numberOfWeeks,
        lessonCount: subject.lessonCount
      }));

      if (homeroomInfo) {
        processedSubjects.push({
          subject: { name: "CCSHL" },
          lessonCount: homeroomInfo.totalReducedLessons
        });
      }

      return {
        _id: classItem._id,
        name: classItem.name,
        grade: classItem.grade,
        campus: classItem.campus,
        size: classItem.size,
        homeroomTeacher: homeroomInfo?.teacherName || null,
        updatedAt: classItem.updatedAt,
        subjects: processedSubjects
      };
    });

    const sortedClasses = processedClasses.sort(sortClasses);

    res.status(200).json({
      classes: sortedClasses,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error in GET /classes:', error);
    res.status(500).json({ message: "Lỗi khi lấy danh sách lớp học" });
  }
});

// GET /classes-without-homeroom
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

// GET /department-classes/:departmentId
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

// GET /by-subject/:subjectId
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
        if (subject.name === "CCSHL") {
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

// Single class creation endpoint
classRouter.post('/create-class', isAuth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
 
  try {
    const { name, grade, campus, subjects, size } = req.body;
 
    // Validate single subject
    if (subjects.length !== 1) {
      throw new Error('Mỗi lớp chỉ được phép có một môn học');
    }
 
    // Kiểm tra lớp có tồn tại và có môn học trùng không
    const existingClass = await Class.findOne({ name }).populate('subjects.subject');
    if (existingClass) {
      // Kiểm tra các môn học mới có trùng với các môn học hiện có không
      const newSubjectNames = subjects.map(s => s.subjectName);
      const existingSubjectNames = existingClass.subjects.map(s => s.subject.name);
      const duplicateSubjects = newSubjectNames.filter(name => existingSubjectNames.includes(name));
 
      if (duplicateSubjects.length > 0) {
        throw new Error(`Lớp ${name} đã tồn tại với các môn: ${duplicateSubjects.join(', ')}`);
      }
    }
 
    const newClass = new Class({
      name,
      grade,
      campus,
      size,
      subjects: []
    });
 
    const subjectData = subjects[0];
    const { subjectId, periodsPerWeek, numberOfWeeks } = subjectData;
    const lessonCount = parseInt(periodsPerWeek) * parseInt(numberOfWeeks);
    
    const subject = await Subject.findById(subjectId).populate('department');
    if (!subject) {
      throw new Error(`Không tìm thấy môn học với ID: ${subjectId}`);
    }
    
    newClass.subjects.push({
      subject: subject._id,
      periodsPerWeek: parseInt(periodsPerWeek),
      numberOfWeeks: parseInt(numberOfWeeks),
      lessonCount
    });
    
    await Department.findByIdAndUpdate(
      subject.department._id,
      { $inc: { totalAssignmentTime: lessonCount } },
      { session }
    );
 
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

// Multiple classes creation endpoint
classRouter.post('/create-classes', isAuth, async (req, res) => {
  let session;
  try {
      session = await mongoose.startSession();
      session.startTransaction();

      const classesData = req.body.classes;
      if (!Array.isArray(classesData) || classesData.length === 0) {
          throw new Error('Dữ liệu lớp học không hợp lệ');
      }

      // First, validate all class names and subjects
      const validationResults = await Promise.all(classesData.map(async (classData) => {
          const { name, subjects } = classData;
          
          // Validate one subject per class
          if (!subjects || subjects.length !== 1) {
              throw new Error(`Lớp ${name} phải có đúng một môn học`);
          }

          // Check if class exists
          const existingClass = await Class.findOne({ name })
              .populate('subjects.subject')
              .session(session);

          if (existingClass) {
              // Get subject names for the existing class
              const existingSubjectNames = existingClass.subjects.map(s => 
                  s.subject.name
              );

              // Check for subject conflicts
              const newSubjectName = subjects[0].subjectName;
              if (existingSubjectNames.includes(newSubjectName)) {
                  throw new Error(`Lớp ${name} đã tồn tại với môn học ${newSubjectName}`);
              }
          }

          return { valid: true, className: name };
      }));

      // Process and create classes
      const createdClasses = [];
      for (const classData of classesData) {
          const { name, grade, campus, size, subjects } = classData;
          
          // Find or validate subject
          const subject = await Subject.findOne({ name: subjects[0].subjectName })
              .populate('department')
              .session(session);

          if (!subject) {
              throw new Error(`Không tìm thấy môn học: ${subjects[0].subjectName}`);
          }

          // Create class with single subject
          const newClass = new Class({
              name,
              grade: parseInt(grade),
              campus,
              size: parseInt(size),
              subjects: [{
                  subject: subject._id,
                  periodsPerWeek: parseInt(subjects[0].periodsPerWeek),
                  numberOfWeeks: parseInt(subjects[0].numberOfWeeks),
                  lessonCount: parseInt(subjects[0].periodsPerWeek) * parseInt(subjects[0].numberOfWeeks)
              }]
          });

          await newClass.save({ session });
          createdClasses.push(newClass);

          // Update department assignment time
          if (subject.department) {
              await Department.findByIdAndUpdate(
                  subject.department._id,
                  { $inc: { totalAssignmentTime: subjects[0].lessonCount } },
                  { session }
              );
          }
      }

      // Log the creation
      const result = new Result({
          action: 'CREATE',
          user: req.user._id,
          entityType: 'Class',
          entityId: createdClasses.map(c => c._id),
          dataAfter: createdClasses
      });

      await result.save({ session });
      await session.commitTransaction();

      res.status(201).json({
          message: "Các lớp đã được tạo thành công",
          classesCreated: createdClasses.length
      });

  } catch (error) {
      if (session) {
          await session.abortTransaction();
      }
      console.error('Chi tiết lỗi:', error);
      res.status(400).json({ message: error.message });
  } finally {
      if (session) {
          session.endSession();
      }
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

      // Tìm và validate các lớp
      const classNames = classesData.map(c => c.name);
      const existingClasses = await Class.find({ name: { $in: classNames } }).session(session);
      if (existingClasses.length !== classNames.length) {
          const notFoundClasses = classNames.filter(name => 
              !existingClasses.some(c => c.name === name)
          );
          throw new Error(`Không tìm thấy các lớp học sau: ${notFoundClasses.join(', ')}`);
      }

      // Tìm và validate các môn học
      const allSubjectNames = [...new Set(
          classesData.flatMap(c => c.subjects.map(s => s.subjectName))
      )];
      const subjects = await Subject.find({ name: { $in: allSubjectNames } })
          .populate('department')
          .session(session);

      if (subjects.length !== allSubjectNames.length) {
          const notFoundSubjects = allSubjectNames.filter(name => 
              !subjects.some(s => s.name === name)
          );
          throw new Error(`Không tìm thấy các môn học sau: ${notFoundSubjects.join(', ')}`);
      }

      const subjectMap = subjects.reduce((map, subject) => {
          map[subject.name] = subject;
          return map;
      }, {});

      // Xử lý từng lớp
      const updatedClasses = await Promise.all(classesData.map(async (classData) => {
          const classToUpdate = await Class.findOne({ name: classData.name }).session(session);
          const classSubjects = [];
          
          // Xử lý từng môn học
          for (const subjectData of classData.subjects) {
              const subject = subjectMap[subjectData.subjectName];
              if (!subject) continue;

              classSubjects.push({
                  subject: subject._id,
                  periodsPerWeek: subjectData.periodsPerWeek,
                  numberOfWeeks: subjectData.numberOfWeeks,
                  lessonCount: subjectData.lessonCount
              });

              // Update department assignment time
              if (subject.department) {
                  const existingSubject = classToUpdate.subjects.find(
                      s => s.subject.toString() === subject._id.toString()
                  );

                  const timeDifference = subjectData.lessonCount - (existingSubject?.lessonCount || 0);

                  if (timeDifference !== 0) {
                      await Department.findByIdAndUpdate(
                          subject.department._id,
                          { $inc: { totalAssignmentTime: timeDifference } },
                          { session }
                      );
                  }
              }
          }

          // Update class with new subjects
          classToUpdate.subjects = classSubjects;
          return classToUpdate.save();
      }));

      // Log the result for each class
      const results = updatedClasses.map(cls => ({
          className: cls.name,
          status: 'Thành công'
      }));

      await session.commitTransaction();
      res.status(200).json({
          message: "Cập nhật môn học thành công",
          results
      });

  } catch (error) {
      await session.abortTransaction();
      console.error('Error in add subjects to classes:', error);
      res.status(400).json({ 
          message: error.message,
          results: []
      });
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
        lessonCount: s.lessonCount,
        periodsPerWeek: s.periodsPerWeek,
        numberOfWeeks: s.numberOfWeeks
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
        lessonCount: s.lessonCount,
        periodsPerWeek: s.periodsPerWeek,
        numberOfWeeks: s.numberOfWeeks
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
    const { subjectId, periodsPerWeek, numberOfWeeks } = req.body;
    const lessonCount = periodsPerWeek * numberOfWeeks;

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
        lessonCount: s.lessonCount,
        periodsPerWeek: s.periodsPerWeek,
        numberOfWeeks: s.numberOfWeeks
      }))
    };

    classToUpdate.subjects.push({
      subject: subject._id,
      lessonCount,
      periodsPerWeek,
      numberOfWeeks
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
          lessonCount,
          periodsPerWeek,
          numberOfWeeks
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
          periodsPerWeek: subjectData.periodsPerWeek,
          numberOfWeeks: subjectData.numberOfWeeks,
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
    const { periodsPerWeek, numberOfWeeks } = req.body;

    if (!periodsPerWeek || !numberOfWeeks) {
      throw new Error('Vui lòng cung cấp đầy đủ thông tin số tiết mỗi tuần và số tuần');
    }

    const classToUpdate = await Class.findById(id)
      .populate({
        path: 'subjects.subject',
        populate: {
          path: 'department'
        }
      })
      .session(session);

    if (!classToUpdate) {
      throw new Error('Không tìm thấy lớp học với ID đã cung cấp');
    }

    const subjectIndex = classToUpdate.subjects.findIndex(s => 
      s.subject && 
      s.subject._id && 
      s.subject._id.toString() === subjectId
    );

    if (subjectIndex === -1) {
      throw new Error('Không tìm thấy môn học trong lớp này');
    }

    const currentSubject = classToUpdate.subjects[subjectIndex];
    const oldLessonCount = currentSubject.lessonCount;
    const newLessonCount = periodsPerWeek * numberOfWeeks;

    // Kiểm tra nếu giảm số tiết và đã có phân công
    if (newLessonCount < oldLessonCount) {
      const existingAssignment = await TeacherAssignment.findOne({
        class: id,
        subject: subjectId
      }).session(session);

      if (existingAssignment) {
        throw new Error('Không thể giảm số tiết cho môn học đã được phân công giảng dạy');
      }
    }

    // Lưu trạng thái trước khi cập nhật
    const classBefore = {
      ...classToUpdate.toObject(),
      subjects: classToUpdate.subjects.map(s => ({
        subject: s.subject._id,
        subjectName: s.subject.name,
        lessonCount: s.lessonCount,
        periodsPerWeek: s.periodsPerWeek,
        numberOfWeeks: s.numberOfWeeks
      }))
    };

    const lessonCountDifference = newLessonCount - oldLessonCount;

    // Kiểm tra và cập nhật department
    if (currentSubject.subject.department) {
      await Department.findByIdAndUpdate(
        currentSubject.subject.department._id,
        { $inc: { totalAssignmentTime: lessonCountDifference } },
        { session }
      );
    }

    // Cập nhật thông tin môn học - giữ nguyên reference đến subject
    classToUpdate.subjects[subjectIndex] = {
      subject: currentSubject.subject._id, // Chỉ lưu ID của subject
      periodsPerWeek: periodsPerWeek,
      numberOfWeeks: numberOfWeeks,
      lessonCount: newLessonCount
    };

    // Cập nhật document
    await Class.findByIdAndUpdate(
      id,
      { $set: { [`subjects.${subjectIndex}`]: classToUpdate.subjects[subjectIndex] } },
      { session, new: true, runValidators: true }
    );

    // Lấy dữ liệu sau khi cập nhật
    const updatedClass = await Class.findById(id)
      .populate({
        path: 'subjects.subject',
        populate: {
          path: 'department'
        }
      })
      .session(session);

    // Lưu trạng thái sau khi cập nhật
    const dataAfter = {
      ...updatedClass.toObject(),
      subjects: updatedClass.subjects.map(s => ({
        subject: s.subject._id,
        subjectName: s.subject.name,
        lessonCount: s.lessonCount,
        periodsPerWeek: s.periodsPerWeek,
        numberOfWeeks: s.numberOfWeeks
      }))
    };

    // Lưu lịch sử thay đổi
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
    res.status(200).json({ 
      message: "Cập nhật số tiết môn học thành công", 
      class: updatedClass 
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("Error details:", error);
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

classRouter.post('/update-all-subjects-periods', isAuth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const classes = await Class.find().session(session);
    
    for (const classItem of classes) {
      const updatedSubjects = classItem.subjects.map(subject => ({
        ...subject.toObject(),
        periodsPerWeek: 3,
        numberOfWeeks: 18,
        lessonCount: 3 * 18
      }));

      await Class.findByIdAndUpdate(
        classItem._id,
        { subjects: updatedSubjects },
        { session }
      );

      // Log the changes
      const result = new Result({
        action: 'UPDATE',
        user: req.user._id,
        entityType: 'Class',
        entityId: classItem._id,
        dataBefore: classItem.toObject(),
        dataAfter: { ...classItem.toObject(), subjects: updatedSubjects }
      });
      await result.save({ session });
    }

    await session.commitTransaction();
    res.status(200).json({ 
      message: "Cập nhật thành công periodsPerWeek và numberOfWeeks cho tất cả các môn học",
      classesUpdated: classes.length
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

classRouter.post('/update-class-names', isAuth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Lấy tất cả các lớp và homeroom assignments
    const classes = await Class.find().session(session);
    const homeroomAssignments = await Homeroom.find()
      .populate('teacher', 'name')
      .session(session);

    const homeroomMap = homeroomAssignments.reduce((acc, homeroom) => {
      if (homeroom.class) {
        acc[homeroom.class.toString()] = homeroom.teacher?.name || 'GVCN';
      }
      return acc;
    }, {});

    const updateOperations = await Promise.all(classes.map(async classItem => {
      const oldName = classItem.name;
      
      // Xử lý tên lớp bằng cách xóa khoảng trắng sau số
      let processedName = oldName.replace(/(\d+)\s+/, '$1');
      
      // Thêm prefix dựa trên campus
      let newName;
      if (classItem.campus === "Quận 5") {
        newName = `Q5-${processedName}-GVCN`;
      } else if (classItem.campus === "Thủ Đức") {
        newName = `TĐ-${processedName}-GVCN`;
      } else {
        newName = processedName;
      }

      // Lưu lại dữ liệu cũ trước khi cập nhật
      const dataBefore = classItem.toObject();

      // Cập nhật tên lớp
      classItem.name = newName;
      await classItem.save({ session });

      // Tạo bản ghi kết quả
      const result = new Result({
        action: 'UPDATE',
        user: req.user._id,
        entityType: 'Class',
        entityId: classItem._id,
        dataBefore,
        dataAfter: classItem.toObject()
      });
      await result.save({ session });

      return {
        oldName,
        newName,
        id: classItem._id
      };
    }));

    await session.commitTransaction();

    res.status(200).json({
      message: "Cập nhật tên lớp thành công",
      updates: updateOperations.map(op => ({
        id: op.id,
        oldName: op.oldName,
        newName: op.newName
      }))
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error in update class names:', error);
    res.status(400).json({ 
      message: error.message,
      error: error.stack
    });
  } finally {
    session.endSession();
  }
});

classRouter.post('/update-names-by-subject', isAuth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { subjectName } = req.body;

    if (!subjectName) {
      throw new Error('Vui lòng cung cấp tên môn học');
    }

    // Tìm subject dựa trên tên
    const subject = await Subject.findOne({ name: subjectName }).session(session);
    if (!subject) {
      throw new Error(`Không tìm thấy môn học: ${subjectName}`);
    }

    // Tìm tất cả các lớp có môn học này
    const classes = await Class.find({
      'subjects.subject': subject._id
    }).session(session);

    if (classes.length === 0) {
      throw new Error(`Không tìm thấy lớp nào có môn học ${subjectName}`);
    }

    const updateResults = await Promise.all(classes.map(async classItem => {
      const oldName = classItem.name;
      
      // Kiểm tra xem tên lớp đã có tên môn học chưa
      if (oldName.includes(`-${subjectName}`)) {
        return {
          id: classItem._id,
          oldName,
          newName: oldName,
          status: 'Đã có tên môn học'
        };
      }

      // Thêm tên môn học vào cuối tên lớp
      const newName = `${oldName}-${subjectName}`;

      // Lưu trạng thái trước khi cập nhật
      const dataBefore = classItem.toObject();

      // Cập nhật tên lớp
      classItem.name = newName;
      await classItem.save({ session });

      // Ghi log thay đổi
      const result = new Result({
        action: 'UPDATE',
        user: req.user._id,
        entityType: 'Class',
        entityId: classItem._id,
        dataBefore,
        dataAfter: classItem.toObject()
      });
      await result.save({ session });

      return {
        id: classItem._id,
        oldName,
        newName,
        status: 'Đã cập nhật'
      };
    }));

    await session.commitTransaction();

    res.status(200).json({
      message: "Cập nhật tên lớp thành công",
      totalClasses: classes.length,
      updates: updateResults
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error in updating class names by subject:', error);
    res.status(400).json({ 
      message: error.message,
      error: error.stack
    });
  } finally {
    session.endSession();
  }
});

export default classRouter;