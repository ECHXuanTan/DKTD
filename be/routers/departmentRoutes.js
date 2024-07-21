import express from 'express';
import Department from '../models/departmentModel.js';
import Result from '../models/resultModel.js';
import { isAuth, isAdmin } from '../utils.js';

const departmentRoutes = express.Router();

departmentRoutes.get('/names', isAuth, async (req, res) => {
  try {
    const departments = await Department.find({}, 'name').sort({ name: 1 });
    const departmentNames = departments.map(dept => dept.name);

    res.json(departmentNames);
  } catch (error) {
    console.error('Error fetching department names:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách tên department' });
  }
});

departmentRoutes.get('/all', isAuth, async (req, res) => {
  try {
    const departments = await Department.find({});

    res.json(departments);
  } catch (error) {
    console.error('Error fetching department names:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách tên department' });
  }
});

departmentRoutes.put(
  '/:id/update-assignment-time',
  isAuth,
  async (req, res) => {
    try {
      const departmentId = req.params.id;
      const { totalAssignmentTime, salaryPrice } = req.body;

      const department = await Department.findById(departmentId);
      const departmentBefore = JSON.parse(JSON.stringify(department.toObject()));

      if (!department) {
        return res.status(404).json({ message: 'Department not found' });
      }

      department.totalAssignmentTime = totalAssignmentTime;
      department.salaryPrice = salaryPrice;
      

      const updatedDepartment = await department.save();

      // Create result
      await Result.create({
        action: 'UPDATE',
        user: req.user._id,
        entityType: 'Department',
        entityId: departmentId,
        dataBefore: departmentBefore,
        dataAfter: updatedDepartment.toObject()
      });

      res.json({
        message: 'Department assignment time updated successfully',
        department: updatedDepartment,
      });
    } catch (error) {
      res.status(500).json({ message: 'Error updating department assignment time', error: error.message });
    }
  }
);



departmentRoutes.post('/create', isAuth, isAdmin, async (req, res) => {
  try {
    const { name } = req.body;

    const existingDepartment = await Department.findOne({ name });
    if (existingDepartment) {
      return res.status(400).json({ message: 'Department đã tồn tại' });
    }

    const newDepartment = new Department({
      name
    });

    const savedDepartment = await newDepartment.save();

    res.status(201).json({
      message: 'Department đã được tạo thành công',
      department: savedDepartment
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

export default departmentRoutes;