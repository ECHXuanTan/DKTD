import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    role: { 
        type: Number, 
        enum: [0, 1, 2], 
        default: 0, 
        required: true 
    },
    googleId: { type: String },
    publicKey: { type: String },
    privateKey: { type: String },
},
{
    timestamps: true,
});

const User = mongoose.model('User', userSchema);
export default User;