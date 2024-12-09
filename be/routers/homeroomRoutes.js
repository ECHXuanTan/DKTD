import express from 'express';
import Homeroom from '../models/homeroomModel.js';

const homeroomRouters = express.Router();

// Create a new homeroom
homeroomRouters.post('/', async (req, res) => {
  try {
    const { teacherId, classData, reducedLessonsPerWeek, reducedWeeks } = req.body;

    // Create new class with empty subjects array
    const newClass = new Class({
      ...classData,
      subjects: []
    });
    const savedClass = await newClass.save();

    // Create homeroom with the new class
    const homeroom = new Homeroom({
      teacher: teacherId,
      class: savedClass._id,
      reducedLessonsPerWeek,
      reducedWeeks,
      totalReducedLessons: reducedLessonsPerWeek * reducedWeeks,
      reductionReason: 'Chủ nhiệm lớp'
    });
    
    const savedHomeroom = await homeroom.save();
    const populatedHomeroom = await Homeroom.findById(savedHomeroom._id)
      .populate('teacher')
      .populate('class');

    res.status(201).json(populatedHomeroom);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all homerooms
homeroomRouters.get('/', async (req, res) => {
  try {
    const homerooms = await Homeroom.find().populate('teacher').populate('class');
    res.json(homerooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a specific homeroom
homeroomRouters.get('/:id', async (req, res) => {
  try {
    const homeroom = await Homeroom.findById(req.params.id).populate('teacher').populate('class');
    if (homeroom) {
      res.json(homeroom);
    } else {
      res.status(404).json({ message: 'Homeroom not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update a homeroom
homeroomRouters.patch('/:id', async (req, res) => {
  try {
    const homeroom = await Homeroom.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(homeroom);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a homeroom
homeroomRouters.delete('/teacher/:teacherId', async (req, res) => {
  try {
    const teacherId = req.params.teacherId;
    const deletedHomeroom = await Homeroom.findOneAndDelete({ teacher: teacherId });
    
    if (deletedHomeroom) {
      res.json({ message: 'Homeroom deleted successfully', deletedHomeroom });
    } else {
      res.status(404).json({ message: 'No homeroom found for this teacher' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a homeroom by ID
homeroomRouters.delete('/:id', async (req, res) => {
  try {
    const homeroom = await Homeroom.findByIdAndDelete(req.params.id);
    if (homeroom) {
      res.json({ message: 'Homeroom deleted successfully', deletedHomeroom: homeroom });
    } else {
      res.status(404).json({ message: 'Homeroom not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default homeroomRouters;