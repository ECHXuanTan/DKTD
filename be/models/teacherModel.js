import mongoose from "mongoose";

const teacherSchema = new mongoose.Schema({
    email: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    position: { type: String, required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    isLeader: { type: Boolean, default: false },
    type: { type: String, required: true },
    totalAssignment: { type: Number, default: 0 },
    lessonsPerWeek: { type: Number, default: 0 },
    teachingWeeks: { type: Number, default: 0 },
    basicTeachingLessons: { type: Number, default: 0 }
  },
  {
    timestamps: true,
  });

const Teacher = mongoose.model('Teacher', teacherSchema);
export default Teacher;