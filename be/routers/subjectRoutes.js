import express from 'express';
import Subject from '../models/subjectModels.js';
import { isAuth } from '../utils.js';
import mongoose from 'mongoose';

const subjectRouter = express.Router();

const compareVietnamese = (a, b) => {
  return a.name.localeCompare(b.name, 'vi');
};

subjectRouter.post('/create', isAuth, async (req, res) => {
  try {
    const { name, department, isSpecialized } = req.body;

    if (!name || !department) {
      return res.status(400).json({ message: 'Name and department are required' });
    }

    const newSubject = new Subject({
      name,
      department,
      isSpecialized: isSpecialized || false  
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
      const subjects = await Subject.find()
        .select('name isSpecialized')
        .populate('department', 'name')
        .lean();
      subjects.sort(compareVietnamese);
      res.json(subjects);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      res.status(500).json({ message: 'Error fetching subjects', error: error.message });
    }
});

subjectRouter.get('/all', isAuth, async (req, res) => {
  try {
      const subjects = await Subject.find()
        .select('name isSpecialized')
        .populate('department', 'name')
        .lean();
      subjects.sort(compareVietnamese);
      const totalSubjects = await Subject.countDocuments();
      
      res.json({
          subjects,
          totalSubjects
      });
  } catch (error) {
      console.error('Error fetching subjects:', error);
      res.status(500).json({ message: 'Error fetching subjects', error: error.message });
  }
});

subjectRouter.get('/non-specialized', isAuth, async (req, res) => {
  try {
    const subjects = await Subject.find({
      isSpecialized: false,
      name: { $ne: 'CCSHL' }  
    })
    .select('name department')
    .populate('department', 'name')
    .lean();
    
    subjects.sort(compareVietnamese);
    res.json(subjects);
  } catch (error) {
    console.error('Error fetching non-specialized subjects:', error);
    res.status(500).json({ message: 'Error fetching non-specialized subjects', error: error.message });
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
      const subjects = await Subject.find({ department: departmentId })
        .populate('department', 'name')
        .lean();
      subjects.sort(compareVietnamese);
      res.json(subjects);
    } catch (error) {
      console.error('Error fetching subjects by department:', error);
      res.status(500).json({ message: 'Error fetching subjects by department', error: error.message });
    }
});

subjectRouter.put('/:id', isAuth, async (req, res) => {
  try {
    const { name, department, isSpecialized } = req.body;
    const subjectId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      return res.status(400).json({ message: 'Invalid subject ID' });
    }

    const updatedSubject = await Subject.findByIdAndUpdate(
      subjectId,
      {
        name,
        department,
        isSpecialized: isSpecialized || false
      },
      { new: true }
    ).populate('department', 'name');

    if (!updatedSubject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    res.json({
      message: 'Subject updated successfully',
      subject: updatedSubject
    });
  } catch (error) {
    console.error('Error updating subject:', error);
    res.status(500).json({ message: 'Error updating subject', error: error.message });
  }
});

subjectRouter.delete('/:id', isAuth, async (req, res) => {
  try {
    const subjectId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      return res.status(400).json({ message: 'Invalid subject ID' });
    }

    const deletedSubject = await Subject.findByIdAndDelete(subjectId);

    if (!deletedSubject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    res.json({
      message: 'Subject deleted successfully',
      subject: deletedSubject
    });
  } catch (error) {
    console.error('Error deleting subject:', error);
    res.status(500).json({ message: 'Error deleting subject', error: error.message });
  }
});

export default subjectRouter;