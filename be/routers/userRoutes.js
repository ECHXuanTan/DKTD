// In userRoutes.js
import express from 'express';
import User from '../models/userModel.js';
import { generateToken, isAuth, isAdmin } from '../utils.js';

const userRoutes = express.Router();

userRoutes.get('/profile', isAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean();
    if (user) {
      // Select only the fields you want to send
      const { _id, name, email, isAdmin } = user;
      res.status(200).json({ user: { _id, name, email, isAdmin } });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Error finding user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default userRoutes;