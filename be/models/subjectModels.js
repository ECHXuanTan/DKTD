import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    isSpecialized: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  });

const Subject = mongoose.model('Subject', subjectSchema);
export default Subject;