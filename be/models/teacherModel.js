import mongoose from "mongoose";

const teacherSchema = new mongoose.Schema({
    email: { type: String, required: true },
    name:{ type: String, required: true },
    phone:{ type: String, required: true, unique: true },
    position:{ type: String, required: true },
    department:{ type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    isLeader: {type: Boolean, default: false},
    salary: { type: Number },
    teachingHours: { type: Number }
  },
  {
    timestamps: true,
  });

const Teacher = mongoose.model('Teacher', teacherSchema);
export default Teacher;