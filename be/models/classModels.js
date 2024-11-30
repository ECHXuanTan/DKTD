import mongoose from "mongoose";

const classSchema = new mongoose.Schema({
    name: { type: String, required: true},
    grade: { type: Number, required: true },
    campus: { type: String, required: true },
    size: {type: Number, required: true },
    subjects: [{
        subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
        lessonCount: { type: Number, required: true },
        periodsPerWeek: { type: Number, required: true }, 
        numberOfWeeks: { type: Number, required: true } 
    }]
  },
  {
    timestamps: true,
  });

const Class = mongoose.model('Class', classSchema);
export default Class;