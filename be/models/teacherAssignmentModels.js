import mongoose from "mongoose";

const teacherAssignmentSchema  = new mongoose.Schema({
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    completedLessons: { type: Number, default: 0 }
  },
  {
    timestamps: true,
  });

const TeacherAssignment = mongoose.model('TeacherAssignment', teacherAssignmentSchema );
export default TeacherAssignment;