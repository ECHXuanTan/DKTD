import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
    name:{ type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String},
    isAdmin: { type: Boolean, default: false, required: true },
    googleId: { type: String},
    publicKey: { type: String },
    privateKey: { type: String },
  },
  {
    timestamps: true,
  });

const User = mongoose.model('User', userSchema);
export default User;