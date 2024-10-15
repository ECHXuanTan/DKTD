import mongoose from "mongoose";

const homeroomSchema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  reducedLessonsPerWeek: { type: Number, default: 0 },
  reducedWeeks: { type: Number, default: 0 },
  totalReducedLessons: { type: Number, default: 0 },
  reductionReason: { type: String, default: '' }
}, {
  timestamps: true,
});

const Homeroom = mongoose.model('Homeroom', homeroomSchema);
export default Homeroom;