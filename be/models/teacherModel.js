import mongoose from "mongoose";

const teacherSchema = new mongoose.Schema({
    email: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String },
    position: { type: String, required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    teachingSubjects: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    type: { type: String, required: true },
    totalAssignment: { type: Number, default: 0 },
    lessonsPerWeek: { type: Number, default: 0 },
    teachingWeeks: { type: Number, default: 0 },
    basicTeachingLessons: { type: Number, default: 0 },
    reducedLessonsPerWeek: { type: Number, default: 0 },
    reducedWeeks: { type: Number, default: 0 },
    totalReducedLessons: { type: Number, default: 0 },
    reductionReason: { type: String, default: '' },
    homeroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' }
  },
  {
    timestamps: true,
  });

const Teacher = mongoose.model('Teacher', teacherSchema);
export default Teacher;   