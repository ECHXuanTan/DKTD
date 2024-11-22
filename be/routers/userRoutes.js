import express from 'express';
import User from '../models/userModel.js';
import { generateToken, isAuth } from '../utils.js';

const userRoutes = express.Router();

userRoutes.get('/profile', isAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean();
    if (user) {
      const { _id, name, email, role } = user;
      res.status(200).json({ user: { _id, name, email, role } });
    } else {
      res.status(401).json({ message: 'Token invalid or expired' });
    }
  } catch (error) {
    console.error('Error finding user:', error);
    res.status(401).json({ message: 'Token invalid or expired' });
  }
});

export default userRoutes;