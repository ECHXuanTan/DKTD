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
    declaredTeachingLessons: { type: Number, default: 0 },
    lessonsPerWeek: { type: Number, default: 0 },
    teachingWeeks: { type: Number, default: 0 },
    basicTeachingLessons: { type: Number, default: 0 },
    reductions: [{
        reducedLessonsPerWeek: { type: Number, required: true },
        reducedWeeks: { type: Number, required: true },
        reductionReason: { type: String, required: true },
        reducedLessons: { type: Number, required: true }
    }],
    totalReducedLessons: { type: Number, default: 0 }
}, {
    timestamps: true
});

const Teacher = mongoose.model('Teacher', teacherSchema);
export default Teacher;