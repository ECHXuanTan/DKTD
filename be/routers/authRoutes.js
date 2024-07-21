import express from 'express';
import User from '../models/userModel.js';
import Teacher from '../models/teacherModel.js';
import { generateToken, generateKeyPair } from '../utils.js';

const authRoutes = express.Router();

authRoutes.post('/check-user', async (req, res) => {
    try {
        const { email, googleId, name } = req.body;

        // First, check for an existing user with this email
        let user = await User.findOne({ email });

        if (user) {
            // If user exists and is admin, allow login
            if (user.isAdmin) {
                const token = generateToken(user);
                return res.json({ 
                    success: true, 
                    token: token,
                    isAdmin: user.isAdmin
                });
            }
            
            // If user exists but is not admin, update googleId if necessary
            if (googleId && user.googleId !== googleId) {
                user.googleId = googleId;
                await user.save();
            }
        }

        // If user is not admin or doesn't exist, check for a teacher
        let teacher = await Teacher.findOne({ email: email });

        if (teacher) {
            // If teacher exists, check if they are a leader
            if (!teacher.isLeader) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Unauthorized: Teacher is not a leader',
                    teacherInfo: { name: teacher.name, email: teacher.email }
                });
            }

            // If teacher is a leader, create or update user
            if (!user) {
                const { publicKey, privateKey } = generateKeyPair();
                user = new User({
                    googleId,
                    name,
                    email,
                    password: '',
                    isAdmin: false,
                    publicKey,
                    privateKey,
                    teacher: teacher._id
                });

                await user.save();

                // Update teacher with user reference
                teacher.user = user._id;
                await teacher.save();
            } else if (!user.teacher) {
                // If user exists but doesn't have teacher reference, add it
                user.teacher = teacher._id;
                await user.save();

                teacher.user = user._id;
                await teacher.save();
            }

            const token = generateToken(user);
            return res.json({ 
                success: true, 
                token: token,
                isAdmin: user.isAdmin
            });
        }

        // If no teacher found and user is not admin, return error
        return res.status(404).json({ 
            success: false, 
            message: 'Unauthorized: User is not an admin and no corresponding teacher found',
            userInfo: { name, email }
        });

    } catch (error) {
        console.error('Error checking user:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

authRoutes.get("/logout", (req, res) => {
    res.status(200).json({ message: "User Logged Out" });
});

export default authRoutes;