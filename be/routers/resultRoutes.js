import express from 'express';
import Result from '../models/resultModel.js';
import { isAuth, isAdmin } from '../utils.js';

const resultRoutes = express.Router();

resultRoutes.get('/all', isAuth, isAdmin, async (req, res) => {
  try {
    const existingResult = await Result.find({})
      .populate({
        path: 'user',
        select: 'name email teacher',
        populate: {
          path: 'teacher',
          model: 'Teacher',
          select: 'name position department',
          populate: {
            path: 'department',
            model: 'Department',
            select: 'name'
          }
        }
      }).lean();
    
    res.status(200).json({ 
      existingResult
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy kết quả.' });
  }
});

resultRoutes.get('/:id', isAuth, isAdmin, async (req, res) => {
  try {
    const resultId = req.params.id;

    const result = await Result.findById(resultId)
      .populate({
        path: 'user',
        select: 'name email teacher',
        populate: {
          path: 'teacher',
          model: 'Teacher',
          select: 'name position department',
          populate: {
            path: 'department',
            model: 'Department',
            select: 'name'
          }
        }
      });

    if (!result) {
      return res.status(404).json({ error: 'Không tìm thấy kết quả với ID đã cho.' });
    }
    
    res.status(200).json({ result });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy kết quả.' });
  }
});


export default resultRoutes;