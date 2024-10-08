import express from 'express';
import User from '../models/userModel.js';
import { generateToken, generateKeyPair } from '../utils.js';

const authRoutes = express.Router();

authRoutes.post('/check-user', async (req, res) => {
    try {
        const { email, googleId, name, password } = req.body;

        let user = await User.findOne({ email });

        if (user) {
            if (googleId && user.googleId !== googleId) {
                user.googleId = googleId;
                await user.save();
            }

            if (password) {
                const isMatch = await user.matchPassword(password);
                if (!isMatch) {
                    return res.status(401).json({ 
                        success: false, 
                        message: 'Invalid credentials'
                    });
                }
            }

            const token = generateToken(user);
            return res.json({ 
                success: true, 
                token: token,
                role: user.role
            });
        }

        return res.status(404).json({ 
            success: false, 
            message: 'User not found',
            userInfo: { name, email }
        });

    } catch (error) {
        console.error('Error checking user:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

authRoutes.post('/create-user', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const { publicKey, privateKey } = generateKeyPair();
        const user = await User.create({
            name,
            email,
            password,
            role: role || 0,  // Default role is 0 if not provided
            publicKey,
            privateKey
        });

        if (user) {
            res.status(201).json({
                success: true,
                message: 'User created successfully',
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });
        } else {
            res.status(400).json({ success: false, message: 'Invalid user data' });
        }
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

authRoutes.get("/logout", (req, res) => {
    res.status(200).json({ message: "User Logged Out" });
});

export default authRoutes;