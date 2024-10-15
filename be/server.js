import express from "express";
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import session from 'express-session';
import authRoutes from "./routers/authRoutes.js";
import userRoutes from "./routers/userRoutes.js";
import resultRoutes from "./routers/resultRoutes.js";
import departmentRoutes from "./routers/departmentRoutes.js";
import teacherRoutes from "./routers/teacherRoutes.js";
import subjectRouter from "./routers/subjectRoutes.js";
import classRouter from "./routers/classRouters.js";
import assignmentRouter from "./routers/assignmentRouter.js";
import statisticsRouter from "./routers/statisticsRouter.js";
import homeroomRouters from "./routers/homeroomRoutes.js";

dotenv.config();

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('connected to db');
  })
  .catch((err) => {
    console.log(err.message);
  });

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'https://khaibao-client.onrender.com'
      // Thêm các domain khác ở đây
    ].filter(Boolean);

    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));;

// Setup session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));

// Use routes
app.use('/api/auth',authRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/subjects', subjectRouter);
app.use('/api/class', classRouter);
app.use('/api/assignment', assignmentRouter);
app.use('/api/statistics', statisticsRouter);
app.use('/api/homerooms', homeroomRouters);



app.get ('/', (req, res) => {
    res.status(200).json({
     message: "Hi"
   })
 })
 
 const port = 5000;
 app.listen(port, () => {
     console.log(`serve at http://localhost:${port}`)
 })
 
