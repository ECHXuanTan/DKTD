import express from 'express';
import Teacher from '../models/teacherModel.js';
import Department from '../models/departmentModel.js';
import Result from '../models/resultModel.js';
import { isAuth, isAdmin } from '../utils.js'; 

const teacherRoutes = express.Router();

teacherRoutes.post('/create', isAuth, async (req, res) => {
  try {
    const { email, name, phone, position, department, isLeader, salary, teachingHours } = req.body;

    const existingTeacher = await Teacher.findOne({ email });
    if (existingTeacher) {
      return res.status(400).json({ message: 'Email đã được sử dụng' });
    }

    const newTeacher = new Teacher({
      email,
      name,
      phone,
      position,
      department,
      isLeader: isLeader || false,
      salary,
      teachingHours
    });

    const savedTeacher = await newTeacher.save();

    // Cập nhật declaredTeachingTime của Department
    await Department.findByIdAndUpdate(department, {
      $inc: { declaredTeachingTime: teachingHours }
    });

    // Create result
    await Result.create({
      action: 'CREATE',
      user: req.user._id,
      entityType: 'Teacher',
      entityId: savedTeacher._id,
      dataAfter: savedTeacher.toObject()
    });

    res.status(201).json({
      message: 'Giáo viên đã được tạo thành công',
      teacher: savedTeacher
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

teacherRoutes.put('/update/:id', isAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, position, teachingHours, department } = req.body;

    const teacher = await Teacher.findById(id);

    if (!teacher) {
      return res.status(404).json({ message: 'Không tìm thấy giáo viên' });
    }

    // Create a deep copy of the teacher before any changes
    const teacherBefore = JSON.parse(JSON.stringify(teacher.toObject()));

    // Update fields
    teacher.name = name || teacher.name;
    teacher.email = email || teacher.email;
    teacher.phone = phone || teacher.phone;

    const oldTeachingHours = teacher.teachingHours || 0;
    const newTeachingHours = teachingHours !== undefined ? teachingHours : oldTeachingHours;
    const hoursDifference = newTeachingHours - oldTeachingHours;

    if (teachingHours !== undefined) {
      teacher.teachingHours = teachingHours;
      // Recalculate salary if teachingHours changed
      const departmentInfo = await Department.findById(department);
      teacher.salary = teachingHours * departmentInfo.salaryPrice;
    }

    const updatedTeacher = await teacher.save();

    // Cập nhật declaredTeachingTime của Department
    await Department.findByIdAndUpdate(department, {
      $inc: { declaredTeachingTime: hoursDifference }
    });

    // Create result
    await Result.create({
      action: 'UPDATE',
      user: req.user._id,
      entityType: 'Teacher',
      entityId: id,
      dataBefore: teacherBefore,
      dataAfter: updatedTeacher.toObject()
    });

    res.json({
      message: 'Cập nhật giáo viên thành công',
      teacher: updatedTeacher
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

teacherRoutes.delete('/delete/:id', isAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const teacher = await Teacher.findById(id);

    if (!teacher) {
      return res.status(404).json({ message: 'Không tìm thấy giáo viên' });
    }

    // Cập nhật declaredTeachingTime của Department
    await Department.findByIdAndUpdate(teacher.department, {
      $inc: { declaredTeachingTime: -(teacher.teachingHours || 0) }
    });

    // Create result before deleting
    await Result.create({
      action: 'DELETE',
      user: req.user._id,
      entityType: 'Teacher',
      entityId: id,
      dataBefore: teacher.toObject()
    });

    await Teacher.findByIdAndDelete(id);

    res.json({
      message: 'Xóa giáo viên thành công',
      id: id
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

teacherRoutes.get('/teacher', isAuth, async (req, res) => {
  try {
    // Lấy email từ người dùng đã xác thực
    const userEmail = req.user.email;

    // Tìm giáo viên theo email
    const teacher = await Teacher.findOne({ email: userEmail }).populate('department', 'name');

    if (!teacher) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin giáo viên' });
    }

    res.json(teacher);
  } catch (error) {
    console.error('Error fetching teacher:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy thông tin giáo viên' });
  }
});

teacherRoutes.get('/department-teachers', isAuth, async (req, res) => {
  try {
    // Get the authenticated user's email
    const userEmail = req.user.email;

    // Find the teacher (user) and check if they are a leader
    const currentTeacher = await Teacher.findOne({ email: userEmail });

    if (!currentTeacher) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin giáo viên' });
    }

    if (!currentTeacher.isLeader) {
      return res.status(403).json({ message: 'Chỉ trưởng bộ môn mới có quyền truy cập thông tin này' });
    }

    // If the user is a leader, fetch all teachers from their department
    const departmentTeachers = await Teacher.find({ department: currentTeacher.department._id }).populate('department')
      .select('-__v'); // Exclude the __v field if you don't need it

    res.json({
      success: true,
      data: departmentTeachers
    });

  } catch (error) {
    console.error('Error fetching department teachers:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách giáo viên trong tổ bộ môn' });
  }
});

export default teacherRoutes;