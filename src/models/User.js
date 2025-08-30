import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    avatarUrl: { type: String, default: '' },
    about: { type: String, default: '' },
    verified: { type: Boolean, default: false },
    lastSeen: { type: Date },
    bio: { type: String, default: "" },
  phone: { type: String, default: "" },
  },
  
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

export default User;   // 👈 default export
