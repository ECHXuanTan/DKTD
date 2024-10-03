import mongoose from "mongoose";

const classSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    grade: { type: Number, required: true },
    campus: { type: String, required: true },
    isSpecial: { type: Boolean, default: false },
    subjects: [{
        subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
        lessonCount: { type: Number, required: true },
        maxTeachers: { type: Number, default: 1 }
    }]
  },
  {
    timestamps: true,
  });

const Class = mongoose.model('Class', classSchema);
export default Class;