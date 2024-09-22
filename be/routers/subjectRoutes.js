import express from 'express';
import Subject from '../models/subjectModels.js';
import { isAuth } from '../utils.js';
import mongoose from 'mongoose';

const subjectRouter = express.Router();

subjectRouter.post('/create', isAuth, async (req, res) => {
  try {
    const { name, department } = req.body;

    if (!name || !department) {
      return res.status(400).json({ message: 'Name and department are required' });
    }

    const newSubject = new Subject({
      name,
      department
    });

    await newSubject.save();

    res.status(201).json({
      message: 'Subject created successfully',
      subject: newSubject
    });
  } catch (error) {
    console.error('Error creating subject:', error);
    res.status(500).json({ message: 'Error creating subject', error: error.message });
  }
});

subjectRouter.get('/', isAuth, async (req, res) => {
    try {
      const subjects = await Subject.find().select('name').populate('department', 'name').lean();
      res.json(subjects);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      res.status(500).json({ message: 'Error fetching subjects', error: error.message });
    }
});

subjectRouter.get('/:id', isAuth, async (req, res) => {
    try {
      const subject = await Subject.findById(req.params.id).populate('department', 'name');
      if (!subject) {
        return res.status(404).json({ message: 'Subject not found' });
      }
      res.json(subject);
    } catch (error) {
      console.error('Error fetching subject:', error);
      res.status(500).json({ message: 'Error fetching subject', error: error.message });
    }
});

subjectRouter.get('/department/:departmentId', isAuth, async (req, res) => {
    try {
      const departmentId = req.params.departmentId;
      if (!mongoose.Types.ObjectId.isValid(departmentId)) {
        return res.status(400).json({ message: 'Invalid department ID' });
      }
      const subjects = await Subject.find({ department: departmentId }).populate('department', 'name').lean();
      res.json(subjects);
    } catch (error) {
      console.error('Error fetching subjects by department:', error);
      res.status(500).json({ message: 'Error fetching subjects by department', error: error.message });
    }
});

export default subjectRouter;