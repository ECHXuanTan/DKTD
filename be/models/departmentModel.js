import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema({
    name:{ type: String, required: true },
    totalAssignmentTime:{ type: Number,},
    declaredTeachingLessons: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  });

const Department = mongoose.model('Department', departmentSchema);
export default Department;